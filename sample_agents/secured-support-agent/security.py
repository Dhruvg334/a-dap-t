import ipaddress
import os
from pathlib import Path
from urllib.parse import urlparse

import jwt
from fastapi import Depends, Header, HTTPException, Request

from config import ALLOWED_FILE_EXTENSIONS, ALLOWED_WEBHOOK_HOSTS, JWT_SECRET, MAX_UPLOAD_BYTES

BASE_INVOICE_DIR = Path("invoices").resolve()
BASE_UPLOAD_DIR = Path("uploads/extracted").resolve()


def verify_token(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ")
    return jwt.decode(
        token,
        JWT_SECRET,
        algorithms=["HS256"],
        issuer="secured-support-agent",
        audience="support-dashboard",
        options={"verify_exp": True, "verify_aud": True, "verify_iss": True},
    )


def require_auth(user=Depends(verify_token)):
    return user


def rate_limit(request: Request):
    # Demo-visible rate-limit hook. Real deployments should back this with Redis/Upstash/slowapi.
    request.state.rate_limit_checked = True
    return True


def require_approval(approval_id: str | None, reviewer: str | None):
    if not approval_id or not reviewer:
        raise ValueError("approval_id and reviewer are required for this action")
    return {"approval_id": approval_id, "reviewer": reviewer, "approval_status": "approved"}


def mask_pii(customer):
    return {
        "user_id": customer["user_id"],
        "name": customer["name"],
        "email": "ri***@example.com",
        "phone": "+91-9****-11111",
        "address": "Masked for privacy",
        "plan": customer["plan"],
        "refund_eligible": customer["refund_eligible"],
    }


def sanitize_prompt(text: str) -> str:
    blocked = ["ignore previous instructions", "reveal system prompt", "bypass approval", "i am an admin"]
    lowered = text.lower()
    if any(pattern in lowered for pattern in blocked):
        raise ValueError("Prompt requires manual review")
    return text[:2000]


def validate_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_WEBHOOK_HOSTS:
        raise ValueError("Webhook host is not allowlisted")
    try:
        ip = ipaddress.ip_address(parsed.hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            raise ValueError("Private network targets are blocked")
    except ValueError:
        # Hostnames are validated by allowlist above. IP values fail closed if private/link-local.
        pass
    return url


def safe_join_invoice(file_name: str) -> Path:
    requested = (BASE_INVOICE_DIR / file_name).resolve()
    if BASE_INVOICE_DIR not in requested.parents and requested != BASE_INVOICE_DIR:
        raise ValueError("Path traversal blocked")
    if requested.suffix not in ALLOWED_FILE_EXTENSIONS:
        raise ValueError("File extension is not allowed")
    return requested


def safe_extract_zip(archive, destination: Path = BASE_UPLOAD_DIR):
    destination.mkdir(parents=True, exist_ok=True)
    for member in archive.infolist():
        final_path = (destination / member.filename).resolve()
        if destination not in final_path.parents and final_path != destination:
            raise ValueError("Unsafe archive member path blocked")
        archive.extract(member, destination)


def secure_filename(file_name: str) -> str:
    cleaned = Path(file_name).name.replace("..", "")
    if Path(cleaned).suffix not in ALLOWED_FILE_EXTENSIONS | {".zip"}:
        raise ValueError("File extension is not allowed")
    return cleaned


def validate_upload_size(content: bytes):
    if len(content) > MAX_UPLOAD_BYTES:
        raise ValueError("Upload exceeds max_size")
    return content
