import os
import sys
import time
import json
import subprocess
import threading
import httpx
import spaces
import torch
import gradio as gr
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse, PlainTextResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Detect Gradio 5 Server Mode
try:
    from gradio import Server
    HAS_SERVER = True
except ImportError:
    HAS_SERVER = False

# ==============================================================================
# 1. ZeroGPU Hook Function
# ==============================================================================
@spaces.GPU
def renderflow_gpu_probe(message: str = "ping") -> str:
    """
    ZeroGPU registered function to satisfy Hugging Face ZeroGPU supervisor.
    """
    device = "cuda" if torch.cuda.is_available() else "cpu"
    t = torch.zeros(1, device=device)
    return f"RenderFlow ZeroGPU Engine Online! Device: {device}, Ping: {message}"

# ==============================================================================
# 2. Application Setup
# ==============================================================================
if HAS_SERVER:
    print("[RenderFlow] Initializing Gradio 5 Server mode...")
    app = Server()
    renderflow_gpu_probe = app.api(name="gpu_probe")(renderflow_gpu_probe)
else:
    print("[RenderFlow] Initializing FastAPI with mounted Gradio...")
    app = FastAPI(title="RenderFlow Cloud Backend")
    with gr.Blocks() as demo:
        btn = gr.Button("Probe")
        out = gr.Textbox()
        btn.click(fn=renderflow_gpu_probe, inputs=None, outputs=out)
    app = gr.mount_gradio_app(app, demo, path="/gradio")

# Add CORS Middleware for Vercel and external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# 3. Reverse Proxy to Internal Node.js Engine
# ==============================================================================
NODE_PORT = 3333
NODE_BASE_URL = f"http://127.0.0.1:{NODE_PORT}"
http_client = httpx.AsyncClient(base_url=NODE_BASE_URL, timeout=3600.0)

async def proxy_to_node(request: Request, path_with_query: str):
    url = httpx.URL(path=path_with_query, query=request.url.query.encode("utf-8"))
    body = await request.body()
    
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)

    try:
        req = http_client.build_request(
            request.method,
            url,
            headers=headers,
            content=body
        )
        resp = await http_client.send(req, stream=True)
        
        resp_headers = dict(resp.headers)
        resp_headers.pop("content-length", None)
        resp_headers.pop("transfer-encoding", None)
        resp_headers.pop("content-encoding", None)

        # Enforce permissive CORS for cross-origin web clients
        resp_headers["access-control-allow-origin"] = "*"
        resp_headers["access-control-allow-methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD"
        resp_headers["access-control-allow-headers"] = "*"
        resp_headers["access-control-expose-headers"] = "*"

        # Enforce binary MP4 attachment download headers for /output/
        if path_with_query.startswith("/output/"):
            base_fname = os.path.basename(path_with_query.split("?")[0])
            if base_fname.endswith(".mp4"):
                resp_headers["content-type"] = "video/mp4"
                is_download = "download=1" in path_with_query or "download" in str(request.query_params)
                if is_download or "range" not in request.headers:
                    resp_headers["content-disposition"] = f'attachment; filename="{base_fname}"'
                else:
                    resp_headers["content-disposition"] = f'inline; filename="{base_fname}"'
                resp_headers["accept-ranges"] = "bytes"

        async def stream_generator():
            try:
                async for chunk in resp.aiter_raw():
                    yield chunk
            finally:
                await resp.aclose()

        media_type = "text/event-stream" if "text/event-stream" in resp.headers.get("content-type", "") else None
        if media_type:
            resp_headers["x-accel-buffering"] = "no"
            resp_headers["cache-control"] = "no-cache, no-transform"

        return StreamingResponse(
            stream_generator(),
            status_code=resp.status_code,
            headers=resp_headers,
            media_type=media_type
        )
    except Exception as exc:
        log_snippet = ""
        if os.path.exists("node_server.log"):
            try:
                with open("node_server.log", "r", encoding="utf-8", errors="ignore") as f:
                    log_snippet = f.read()[-2000:]
            except Exception:
                pass
        return JSONResponse(
            status_code=502,
            content={
                "error": f"Node.js engine unavailable: {str(exc)}",
                "node_log": log_snippet
            }
        )

# Root dashboard
@app.get("/")
def root_status():
    return {
        "status": "online",
        "service": "RenderFlow Cloud Engine",
        "hardware": "Hugging Face ZeroGPU",
        "routes": {
            "render_html": "/api/render-html",
            "render_code": "/api/render-code-sse",
            "history": "/api/history",
            "status": "/api/status",
            "node_log": "/api/node-log"
        }
    }

# Diagnostic log viewer
@app.get("/api/node-log")
def node_log_view():
    if os.path.exists("node_server.log"):
        with open("node_server.log", "r", encoding="utf-8", errors="ignore") as f:
            return PlainTextResponse(f.read()[-20000:])
    return PlainTextResponse("node_server.log does not exist yet.")

# Direct API routes
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
async def route_api(request: Request, path: str):
    return await proxy_to_node(request, f"/api/{path}")

@app.api_route("/output/{path:path}", methods=["GET", "HEAD"])
async def route_output(request: Request, path: str):
    return await proxy_to_node(request, f"/output/{path}")

@app.api_route("/download/{path:path}", methods=["GET", "HEAD"])
async def route_download(request: Request, path: str):
    return await proxy_to_node(request, f"/output/{path}?download=1")

@app.api_route("/uploads/{path:path}", methods=["GET", "HEAD"])
async def route_uploads(request: Request, path: str):
    return await proxy_to_node(request, f"/uploads/{path}")

@app.api_route("/previews/{path:path}", methods=["GET", "HEAD"])
async def route_previews(request: Request, path: str):
    return await proxy_to_node(request, f"/previews/{path}")

@app.api_route("/fixtures/{path:path}", methods=["GET", "HEAD"])
async def route_fixtures(request: Request, path: str):
    return await proxy_to_node(request, f"/fixtures/{path}")

# ==============================================================================
# 4. Background Node.js Engine Starter
# ==============================================================================
def start_node_engine():
    print("[RenderFlow] Verifying node_modules...")
    if not os.path.exists("node_modules"):
        print("[RenderFlow] Installing production dependencies via npm...")
        subprocess.run(["npm", "install", "--production"], check=True)

    env = os.environ.copy()
    env["PORT"] = str(NODE_PORT)
    env["PUPPETEER_SKIP_CHROMIUM_DOWNLOAD"] = "true"

    for chrome_bin in ["/usr/bin/chromium", "/usr/bin/chromium-browser"]:
        if os.path.exists(chrome_bin):
            env["CHROME_PATH"] = chrome_bin
            env["PUPPETEER_EXECUTABLE_PATH"] = chrome_bin
            print(f"[RenderFlow] Detected Chromium at: {chrome_bin}")
            break

    print(f"[RenderFlow] Launching Node.js engine on internal port {NODE_PORT}...")
    sys.stdout.flush()
    node_log = open("node_server.log", "w", encoding="utf-8")
    proc = subprocess.Popen(
        ["node", "src/preview-server.js"],
        env=env,
        stdout=node_log,
        stderr=subprocess.STDOUT
    )
    return proc

if __name__ == "__main__":
    node_proc = start_node_engine()
    time.sleep(2)
    print("[RenderFlow] Launching application on port 7860...")
    sys.stdout.flush()
    if HAS_SERVER:
        app.launch(server_name="0.0.0.0", server_port=7860)
    else:
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=7860)
