# Authentication Module Technical Manual
**Version:** 1.2.0
**Date:** 2026-02-28
**Scope:** Backend & Frontend

---

## 1. Overview
This module provides secure authentication and authorization services for the Mikrotik API application. It implements JSON Web Tokens (JWT) for stateless authentication, Argon2 for password hashing, and AES encryption for router credentials. It also includes comprehensive User Management capabilities and Reporting security.

## 2. Backend Architecture

### 2.1 Dependencies
*   **Security:** `passlib[argon2]`, `python-jose` (replaced by `pyjwt`), `cryptography`
*   **Database:** SQLAlchemy (Async)
*   **Framework:** FastAPI

### 2.2 Key Components
*   **`app/core/security.py`**:
    *   `get_password_hash(password)`: Hashes passwords using Argon2.
    *   `verify_password(plain, hashed)`: Verifies passwords.
    *   `create_access_token(data, expires_delta)`: Generates JWT tokens.
    *   `decode_access_token(token)`: Validates and decodes tokens.

*   **`app/api/deps.py`**:
    *   `get_current_user`: Dependency that extracts the token from the `Authorization: Bearer <token>` header, validates it, and retrieves the user from the database.
    *   `get_current_active_superuser`: Ensures the user has superuser privileges.

*   **`app/api/endpoints/auth.py`**:
    *   `POST /login/access-token`: Authenticates username/password and returns a JWT access token.
    *   `POST /test-token`: A protected endpoint to verify token validity.

*   **`app/api/endpoints/users.py`**:
    *   `GET /`: List users (Admin only).
    *   `POST /`: Create user (Admin only).
    *   `PUT /{user_id}`: Update user (Admin/Self).
    *   `DELETE /{user_id}`: Delete user (Admin only).

*   **`app/api/endpoints/reports.py`**:
    *   `GET /daily/{board_id}`: Protected daily reports.
    *   `GET /monthly/{board_id}`: Protected monthly reports.
    *   `GET /export/{board_id}`: Protected PDF/CSV export.
    *   `POST /trigger-aggregation`: Protected (Superuser) manual aggregation trigger.

### 2.3 Database Schema (User Model)
The `MasterUser` model (`app/models/user.py`) stores user credentials securely:
*   `user_id`: UUID Primary Key
*   `username`: Unique identifier
*   `password_hash`: Argon2 hash
*   `full_name`: User's full name
*   `role`: 'admin' or 'teknisi'
*   `is_active`: Boolean flag
*   `is_superuser`: Boolean flag

## 3. Frontend Integration

### 3.1 State Management (`AuthContext.jsx`)
*   Provides `user` object and `login`/`logout` functions to the entire application.
*   Persists authentication state using `localStorage` (key: `token`).
*   Automatically validates the token on application load.

### 3.2 Route Protection (`PrivateRoute.jsx`)
*   A Higher-Order Component (HOC) that wraps protected routes.
*   Redirects unauthenticated users to `/login`.
*   Displays a loading spinner while verifying authentication status.

### 3.3 User Management (`pages/Users.jsx`)
*   Full CRUD interface for managing users.
*   Role-based visibility (only admins can access via `Layout.jsx` link).
*   Uses `services/api.js` for backend communication.

### 3.4 API Interceptors (`services/api.js`)
*   **Request Interceptor**: Automatically attaches the JWT token to the `Authorization` header for every request.
*   **Response Interceptor**: Automatically redirects to `/login` if the backend returns a 401 Unauthorized error (token expired/invalid).

## 4. Security Best Practices
*   **Algorithm**: HS256 (HMAC with SHA-256) for JWT signing.
*   **Password Hashing**: Argon2id (memory-hard function) to resist GPU-based cracking.
*   **Token Expiry**: Configurable via `ACCESS_TOKEN_EXPIRE_MINUTES` in `.env`.
*   **Role-Based Access Control (RBAC)**: Enforced via `get_current_active_superuser` dependency and frontend conditional rendering.

## 5. Usage Guide

### 5.1 Creating a Superuser
Run the script to create an initial administrator account:
```bash
python scripts/create_superuser.py
```

### 5.2 Protecting an Endpoint
To protect a new API endpoint, add the `current_user` dependency:
```python
from app.api import deps
from app.models.user import MasterUser

@router.get("/secure-data")
def read_secure_data(current_user: MasterUser = Depends(deps.get_current_user)):
    return {"message": f"Hello {current_user.username}"}
```

### 5.3 Accessing User in Frontend
```jsx
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { user } = useAuth();

  if (user?.role === 'admin') {
      // Render admin content
  }
};
```
