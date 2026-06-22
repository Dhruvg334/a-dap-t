import jwt

from config import JWT_SECRET


def decode_user_token(token):
    # Vulnerability: weak verification settings and hardcoded secret.
    return jwt.decode(token, JWT_SECRET, options={"verify_signature": False})
