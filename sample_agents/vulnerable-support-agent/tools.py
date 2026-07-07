import os
import sqlite3
import subprocess
import tarfile
import zipfile

import requests
import yaml

from config import DATABASE_URL


def get_customer_record(user_id):
    return {
        "user_id": user_id,
        "name": "Riya Sharma",
        "email": "riya.demo@example.com",
        "phone": "+91-90000-11111",
        "address": "221 Demo Street, Bengaluru",
        "plan": "Premium",
        "last_order_id": "ORD-7781",
        "refund_eligible": True,
        "support_notes": "Customer reported failed billing twice. Priority customer."
    }


def read_internal_policy():
    return "Refunds below Rs. 5000 can be processed instantly by support agents."


def update_customer_profile(user_id, field_name, value):
    # Vulnerability: user-controlled SQL fragments and no reviewer approval.
    connection = sqlite3.connect("support.db")
    query = f"UPDATE customers SET {field_name} = '{value}' WHERE user_id = {user_id}"
    connection.execute(query)
    connection.commit()
    return {"status": "updated", "user_id": user_id, "field": field_name}


def issue_refund(user_id, amount):
    # Vulnerability: no approval_id, no human_review, no confirm_action, no audit log.
    return {
        "status": "refund_processed",
        "user_id": user_id,
        "amount": amount,
        "processor": "agent_auto_action"
    }


def send_email(customer_email, message):
    return {
        "status": "email_sent",
        "to": customer_email,
        "message": message
    }


def call_customer_webhook(callback_url, payload):
    # Vulnerability: user-controlled URL reaches a server-side request.
    return requests.post(callback_url, json=payload, timeout=3).json()


def download_invoice(file_name):
    # Vulnerability: user-controlled filename reaches filesystem path.
    file_path = os.path.join("invoices", file_name)
    with open(file_path, "r", encoding="utf-8") as invoice_file:
        return invoice_file.read()


def extract_support_archive(upload_path):
    # Vulnerability: unsafe archive extraction allows Zip Slip style paths.
    if upload_path.endswith(".zip"):
        with zipfile.ZipFile(upload_path) as archive:
            archive.extractall("uploads/extracted")
    if upload_path.endswith(".tar"):
        with tarfile.open(upload_path) as archive:
            archive.extractall("uploads/extracted")
    return {"status": "extracted"}


def run_diagnostic_command(command):
    # Vulnerability: prompt/user-controlled command reaches shell execution.
    return subprocess.run(command, shell=True, capture_output=True, text=True).stdout


def load_agent_plugin(plugin_yaml):
    # Vulnerability: unsafe deserialization of plugin config.
    return yaml.load(plugin_yaml)
