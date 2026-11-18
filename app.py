import os
import sys
import time
import subprocess
import threading
import httpx
import spaces
import torch
import gradio as gr
from fastapi import Request, Response
from fastapi.responses import StreamingResponse, PlainTextResponse

# ==============================================================================
# 1. ZeroGPU Hook Function
# ==============================================================================
@spaces.GPU
def renderflow_gpu_probe(message: str = "ping"):
    """
    ZeroGPU registered function to satisfy Hugging Face ZeroGPU supervisor.
    """
    device = "cuda" if torch.cuda.is_available() else "cpu"
    t = torch.zeros(1, device=device)
    return f"RenderFlow ZeroGPU Engine Online! Compute Device: {device}, Ping: {message}"

# ==============================================================================
# 2. Gradio Interface
# ==============================================================================
demo = gr.Interface(
    fn=renderflow_gpu_probe,
    inputs=gr.Textbox(value="ping", label="ZeroGPU Status Probe"),
    outputs=gr.Textbox(label="Status Response"),
    title="RenderFlow Cloud Engine",
    description="Headless HTML5 / Three.js / WebGL 60 FPS video synthesis backend powered by Hugging Face ZeroGPU."
)

fastapi_app = demo.app
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
        # Prevent duplicated CORS headers
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

# ==============================================================================
# 3. HTTP Middleware (Intercepts before Gradio SPA router)
# ==============================================================================
@fastapi_app.middleware("http")
async def reverse_proxy_middleware(request: Request, call_next):
    path = request.url.path

    # Diagnostic endpoint to view Node server logs
    if path == "/api/node-log":
        if os.path.exists("node_server.log"):
            with open("node_server.log", "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()[-10000:]
            return PlainTextResponse(content)
        return PlainTextResponse("node_server.log does not exist yet")

    # Proxy all backend routes to Node.js
    PROXIED_PREFIXES = ("/api/", "/output/", "/uploads/", "/previews/", "/fixtures/")
    if any(path.startswith(prefix) for prefix in PROXIED_PREFIXES):
        return await proxy_to_node(request, path)

    # Let Gradio handle the rest (UI, static files, WebSocket)
    return await call_next(request)

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
    print("[RenderFlow] Starting Gradio server on port 7860...")
    sys.stdout.flush()
    demo.queue()
    demo.launch(server_name="0.0.0.0", server_port=7860)
