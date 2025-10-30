from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from models import TokenData
import os
from dotenv import load_dotenv, find_dotenv

# Try to load .env from the backend folder (or parent). find_dotenv helps locate it reliably.
load_dotenv(find_dotenv())

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT with iat claim (no expiration - tokens never expire).

    data: a dict that may include 'sub' and other non-sensitive claims.
    """
    to_encode = data.copy()
    now = datetime.utcnow()
    
    # Use integer timestamps for compatibility
    iat = int(now.timestamp())
    
    # No expiration claim - tokens never expire
    to_encode.update({
        "iat": iat
        # Removed "exp" claim - tokens will be valid indefinitely
    })
    
    print(f"Creating JWT token - current time: {now}")
    print("Token will NEVER expire (no time limit)")

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, credentials_exception=None):
    """Verify JWT and return TokenData. If credentials_exception is provided it's raised on failure.

    This helper prints a short debug hint when verification fails to aid local debugging
    (it does NOT print the full token or secret).
    """
    if credentials_exception is None:
        from fastapi import HTTPException, status
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_type: str = payload.get("user_type")
        
        # Debug information
        current_time = datetime.utcnow()
        exp_timestamp = payload.get("exp")
        iat_timestamp = payload.get("iat")
        
        if exp_timestamp:
            exp_time = datetime.fromtimestamp(exp_timestamp)
            print(f"Token verification - current: {current_time}, expires: {exp_time}")
            print(f"Token valid for {(exp_time - current_time).total_seconds()} more seconds")
        else:
            print(f"Token verification - current: {current_time}")
            print("Token has NO expiration (valid indefinitely)")
            
        if iat_timestamp:
            iat_time = datetime.fromtimestamp(iat_timestamp)
            print(f"Token was issued at: {iat_time}")
        
        if username is None:
            # token missing expected subject
            raise credentials_exception
        token_data = TokenData(username=username, user_type=user_type)
        return token_data
    except JWTError as e:
        # Show a short debug hint to console for local development
        try:
            short = token[:8] + '...' if token else '<empty>'
        except Exception:
            short = '<invalid-token>'
        print(f"JWT verification failed for token {short}: {str(e)}")
        raise credentials_exception