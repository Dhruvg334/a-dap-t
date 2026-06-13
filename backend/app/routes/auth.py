import os
import requests
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.user_schema import UserSignupSchema, UserLoginSchema, UserResponseSchema
from app.utils.firebase_utils import verify_token
from firebase_admin import auth

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Formal security scheme for Swagger UI
security = HTTPBearer(auto_error=False)

# Firebase Web API Key
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY")

@router.post("/signup", response_model=UserResponseSchema)
def signup(user_data: UserSignupSchema):
    try:
        user = auth.create_user(
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.display_name
        )
        return {
            "uid": user.uid,
            "email": user.email,
            "display_name": user.display_name
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
def login(user_data: UserLoginSchema):
    if not FIREBASE_WEB_API_KEY:
        raise HTTPException(status_code=500, detail="Firebase Web API Key not configured")

    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"
    payload = {
        "email": user_data.email,
        "password": user_data.password,
        "returnSecureToken": True
    }

    response = requests.post(url, json=payload)
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return response.json()

async def get_current_user(res: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to get the current authenticated user from Firebase.
    """
    if not res:
        return None

    token = res.credentials.strip()

    # Verify the token
    decoded_token = verify_token(token)

    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return decoded_token
