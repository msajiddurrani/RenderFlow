import os
import sys
import time
import subprocess
import threading
import httpx
import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import spaces
import gradio as gr

# ==============================================================================
# 1. ZeroGPU Hook (Mandatory for Hugging Face ZeroGPU startup scanner)
# ==============================================================================
@spaces.GPU
def renderflow_gpu_probe(message: str = "ping"):
    """
    ZeroGPU registered function to satisfy Hugging Face ZeroGPU supervisor.
    """
    return f"RenderFlow ZeroGPU Engine Online! (Received: {message})"

# ==============================================================================
# 2. Gradio Interface (Mounted at root "/" so visitors see status UI)
# ==============================================================================
with gr.Blocks(title="RenderFlow Cloud Engine") as demo:
    gr.Markdown("# 🚀 RenderFlow Cloud Engine")
    gr.Markdown("Headless HTML5 / Three.js / WebGL 60 FPS video synthesis backend powered by Hugging Face ZeroGPU.")
    with gr.Row():
        probe_input = gr.Textbox(value="ping", label="ZeroGPU Status Probe")
        probe_output = gr.Textbox(label="Status Response")
    probe_button = gr.Button("Test ZeroGPU Hardware")
    probe_button.click(fn=renderflow_gpu_probe, inputs=probe_input, outputs=probe_output)
    gr.Markdown("---")
    gr.Markdown(
        "**Vercel Client Connection:** Point your RenderFlow web UI to `https://durrani6969-renderflow-engine.hf.space` "
        "to render exact 60 FPS MP4 videos without freezing your browser."
    )

# ==============================================================================
# 3. FastAPI App & Reverse Proxy to Internal Node.js Engine
# ==============================================================================
app = FastAPI(title="RenderFlow Cloud Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NODE_PORT = 3333
NODE_BASE_URL = f"http://127.0.0.1:{NODE_PORT}"
http_client = httpx.AsyncClient(base_url=NODE_BASE_URL, timeout=3600.0)

async def proxy_to_node(request: Request, path_with_query: str):
    """
    Reverse proxies any HTTP request to the internal Node.js Puppeteer engine,
    fully supporting Server-Sent Events (SSE) streaming and large file transfers.
    """
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
        # Avoid duplicate CORS headers from downstream
        resp_headers.pop("access-control-allow-origin", None)
        resp_headers.pop("access-control-allow-methods", None)
        resp_headers.pop("access-control-allow-headers", None)

        async def stream_generator():
            try:
                async for chunk in resp.aiter_raw():
                    yield chunk
            finally:
                await resp.aclose()

        return StreamingResponse(
            stream_generator(),
            status_code=resp.status_code,
            headers=resp_headers
        )
    except Exception as exc:
        return Response(
            content=f'{{"error": "Node.js engine unavailable", "details": "{str(exc)}"}}',
            status_code=502,
            media_type="application/json"
        )

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
async def route_api(request: Request, path: str):
    return await proxy_to_node(request, f"/api/{path}")

@app.api_route("/output/{path:path}", methods=["GET", "HEAD"])
async def route_output(request: Request, path: str):
    return await proxy_to_node(request, f"/output/{path}")

@app.api_route("/uploads/{path:path}", methods=["GET", "HEAD"])
async def route_uploads(request: Request, path: str):
    return await proxy_to_node(request, f"/uploads/{path}")

@app.api_route("/previews/{path:path}", methods=["GET", "HEAD"])
async def route_previews(request: Request, path: str):
    return await proxy_to_node(request, f"/previews/{path}")

@app.api_route("/fixtures/{path:path}", methods=["GET", "HEAD"])
async def route_fixtures(request: Request, path: str):
    return await proxy_to_node(request, f"/fixtures/{path}")

# Mount Gradio app at root "/"
app = gr.mount_gradio_app(app, demo, path="/")

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
    proc = subprocess.Popen(["node", "src/preview-server.js"], env=env)
    return proc

if __name__ == "__main__":
    node_proc = start_node_engine()
    
    # Wait for Node server to start listening
    time.sleep(3)
    
    print("[RenderFlow] Launching Uvicorn server on port 7860...")
    sys.stdout.flush()
    uvicorn.run(app, host="0.0.0.0", port=7860)
