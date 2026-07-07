import zipfile

import requests

from audit import audit_log
from security import mask_pii, require_approval, safe_extract_zip, safe_join_invoice, validate_url

TOOL_ALLOWLIST = {"get_customer_record", "request_human_review", "issue_refund", "send_email", "call_customer_webhook", "download_invoice"}


def get_customer_record(user_id):
    customer = {
        "user_id": user_id,
        "name": "Riya Sharma",
        "email": "riya.demo@example.com",
        "phone": "+91-90000-11111",
        "address": "221 Demo Street, Bengaluru",
        "plan": "Premium",
        "refund_eligible": True,
    }
    audit_log("customer_read", user_id, "get_customer_record", "not_required")
    return mask_pii(customer)


def request_human_review(user_id, amount, action="issue_refund"):
    audit_log("approval_requested", user_id, action, "pending", metadata={"amount": amount})
    return {"approval_required": True, "approval_status": "pending", "user_id": user_id, "amount": amount, "action": action}


def issue_refund(user_id, amount, approval_id=None, reviewer=None):
    approval = require_approval(approval_id, reviewer)
    audit_log("refund_processed", user_id, "issue_refund", approval["approval_status"], metadata={"amount": amount})
    return {"status": "refund_processed", "user_id": user_id, "amount": amount, "approved_by": reviewer}


def send_email(customer_email, message, approval_id=None, reviewer=None):
    approval = require_approval(approval_id, reviewer)
    audit_log("email_sent", 102, "send_email", approval["approval_status"])
    return {"status": "email_sent", "to": "ri***@example.com", "message": message[:500]}


def call_customer_webhook(callback_url, payload, approval_id=None, reviewer=None):
    approval = require_approval(approval_id, reviewer)
    safe_url = validate_url(callback_url)
    audit_log("webhook_called", 102, "call_customer_webhook", approval["approval_status"], metadata={"host": safe_url})
    return requests.post(safe_url, json=payload, timeout=3).json()


def download_invoice(file_name):
    invoice_path = safe_join_invoice(file_name)
    audit_log("invoice_read", 102, "download_invoice", "not_required")
    with open(invoice_path, "r", encoding="utf-8") as invoice_file:
        return invoice_file.read()


def extract_support_archive(upload_path):
    with zipfile.ZipFile(upload_path) as archive:
        safe_extract_zip(archive)
    audit_log("archive_extracted", 102, "extract_support_archive", "approved")
    return {"status": "extracted"}
