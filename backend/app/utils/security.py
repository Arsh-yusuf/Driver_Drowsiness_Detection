from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MAX_PASSWORD_LENGTH = 72  # bcrypt limit

def hash_password(password: str) -> str:
    safe_password = password[:MAX_PASSWORD_LENGTH]
    return pwd_context.hash(safe_password)

def verify_password(password: str, hashed: str) -> bool:
    safe_password = password[:MAX_PASSWORD_LENGTH]
    return pwd_context.verify(safe_password, hashed)
