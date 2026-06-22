from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from agent import handle_user_request
from tools import call_customer_webhook, download_invoice, extract_support_archive, issue_refund, run_diagnostic_command

app = FastAPI(title="Vulnerable Support Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/assistant/chat")
async def chat(request: Request):
    body = await request.json()
    return handle_user_request(body.get("message", ""), body.get("callback_url"))


@app.post("/refund")
async def refund(request: Request):
    body = await request.json()
    return issue_refund(body.get("user_id"), body.get("amount"))


@app.post("/webhook/test")
async def webhook_test(request: Request):
    body = await request.json()
    return call_customer_webhook(body.get("url"), body)


@app.get("/invoice/{file_name}")
async def invoice(file_name: str):
    return {"invoice": download_invoice(file_name)}


@app.post("/upload/archive")
async def upload_archive(file: UploadFile = File(...)):
    upload_path = f"uploads/{file.filename}"
    with open(upload_path, "wb") as saved_file:
        saved_file.write(await file.read())
    return extract_support_archive(upload_path)


@app.post("/admin/diagnostic")
async def diagnostic(request: Request):
    body = await request.json()
    return {"output": run_diagnostic_command(body.get("command", ""))}
