from fastapi import Depends, FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agent import handle_user_request
from audit import audit_log
from config import ALLOWED_ORIGINS
from security import rate_limit, require_auth, secure_filename, validate_upload_size
from tools import call_customer_webhook, download_invoice, extract_support_archive, issue_refund

app = FastAPI(title="Secured Support Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class RefundRequest(BaseModel):
    user_id: int
    amount: int = Field(gt=0, le=5000)
    approval_id: str
    reviewer: str


class WebhookRequest(BaseModel):
    url: str
    approval_id: str
    reviewer: str


@app.post("/assistant/chat", dependencies=[Depends(require_auth), Depends(rate_limit)])
async def chat(payload: ChatRequest):
    return handle_user_request(payload.message)


@app.post("/refund", dependencies=[Depends(require_auth), Depends(rate_limit)])
async def refund(payload: RefundRequest):
    audit_log("refund_route_received", payload.user_id, "refund", "approval_checked")
    return issue_refund(payload.user_id, payload.amount, payload.approval_id, payload.reviewer)


@app.post("/webhook/test", dependencies=[Depends(require_auth), Depends(rate_limit)])
async def webhook_test(payload: WebhookRequest):
    return call_customer_webhook(payload.url, {"status": "test"}, payload.approval_id, payload.reviewer)


@app.get("/invoice/{file_name}", dependencies=[Depends(require_auth), Depends(rate_limit)])
async def invoice(file_name: str):
    return {"invoice": download_invoice(file_name)}


@app.post("/upload/archive", dependencies=[Depends(require_auth), Depends(rate_limit)])
async def upload_archive(file: UploadFile = File(...)):
    content = validate_upload_size(await file.read())
    upload_name = secure_filename(file.filename)
    upload_path = f"uploads/{upload_name}"
    with open(upload_path, "wb") as saved_file:
        saved_file.write(content)
    return extract_support_archive(upload_path)
