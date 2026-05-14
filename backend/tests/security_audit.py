
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.core.encryption import encrypt_password, decrypt_password
from app.core.config import settings

def test_security_audit():
    print("--- Security Audit Started ---")
    
    # 1. Argon2 Test
    password = "SuperSecretPassword123"
    hashed = get_password_hash(password)
    print(f"Argon2 Hash: {hashed[:30]}...")
    assert "$argon2id$" in hashed
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False
    print("✅ Argon2 Hashing Verified")
    
    # 2. JWT Test
    user_id = "test-user-id"
    token = create_access_token(user_id)
    print(f"JWT Token: {token[:30]}...")
    decoded = decode_access_token(token)
    assert decoded["sub"] == user_id
    print("✅ JWT Token Verified")
    
    # 3. Fernet Test
    plain_text = "RouterPassword789"
    encrypted = encrypt_password(plain_text)
    print(f"Fernet Encrypted: {encrypted[:30]}...")
    decrypted = decrypt_password(encrypted)
    assert decrypted == plain_text
    print("✅ Fernet Encryption Verified")
    
    print("--- Security Audit Completed Successfully ---")

if __name__ == "__main__":
    test_security_audit()
