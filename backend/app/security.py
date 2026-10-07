import os
import base64
import hashlib
from pathlib import Path
from cryptography.fernet import Fernet
from app.config import ENCRYPTION_KEY_FILE

_fernet_instance: Fernet | None = None

def get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance

    key_from_env = os.getenv("TOKEN_ENCRYPTION_KEY")
    if key_from_env:
        try:
            _fernet_instance = Fernet(key_from_env.encode("utf-8"))
        except Exception:
            derived_key = base64.urlsafe_b64encode(hashlib.sha256(key_from_env.encode("utf-8")).digest())
            _fernet_instance = Fernet(derived_key)
        return _fernet_instance

    key_file = Path(ENCRYPTION_KEY_FILE)
    if key_file.exists():
        key = key_file.read_bytes().strip()
    else:
        key = Fernet.generate_key()
        key_file.write_bytes(key)

    _fernet_instance = Fernet(key)
    return _fernet_instance

def encrypt_token(token: str | None) -> str | None:
    if not token:
        return None
    fernet = get_fernet()
    return fernet.encrypt(token.encode("utf-8")).decode("utf-8")

def decrypt_token(cipher_text: str | None) -> str | None:
    if not cipher_text:
        return None
    fernet = get_fernet()
    try:
        return fernet.decrypt(cipher_text.encode("utf-8")).decode("utf-8")
    except Exception:
        # Fallback if text was stored unencrypted in development/testing
        return cipher_text
