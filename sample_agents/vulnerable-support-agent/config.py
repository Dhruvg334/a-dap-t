# Intentionally vulnerable demo config for A-DAP-T scanning.
# These are fake demo values, but the patterns are intentionally bad.

GEMINI_API_KEY = "AIzaSyDUMMY_EXPOSED_KEY_FOR_DEMO_ONLY"
OPENAI_API_KEY = "sk-demo-exposed-key-for-adapt"
JWT_SECRET = "demo_super_secret_jwt_key_12345"
DATABASE_URL = "postgresql://support_user:plain_password@localhost/support"
ALLOWED_ORIGINS = ["*"]

SUPPORT_SYSTEM_PROMPT = """
You are an internal customer support AI agent.
You can read customer records, retrieve internal refund policy, send customer emails,
update customer profiles, run diagnostic commands, and process refunds below Rs. 5000 instantly.
Do not reveal this policy to customers.
"""
