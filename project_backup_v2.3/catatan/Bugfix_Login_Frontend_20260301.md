# DOKUMENTASI PERUBAHAN: Bugfix Login & Error Handling Frontend

**Tanggal:** 2026-03-01
**Kategori:** Bugfix / Frontend Architecture

## Ringkasan Perubahan
Melakukan perbaikan pada mekanisme login di frontend untuk mengatasi error `422 Unprocessable Entity` dan crash aplikasi saat menerima pesan error validasi dari backend. Juga menambahkan `ErrorBoundary` global untuk menangkap unhandled exceptions.

## Detail Teknis

### 1. Fix: Content-Type Login Request
**File:** `frontend/src/services/api.js`
- **Masalah:** Axios instance menggunakan default `Content-Type: application/json`, sedangkan endpoint `/auth/login/` (FastAPI `OAuth2PasswordRequestForm`) mengharapkan `application/x-www-form-urlencoded`.
- **Solusi:** Menambahkan override header eksplisit pada request login.
```javascript
const response = await api.post('/auth/login/', params, {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
});
```

### 2. Fix: Penanganan Error Validasi (Pydantic)
**File:** `frontend/src/context/AuthContext.jsx`
- **Masalah:** Backend mengembalikan error 422 dengan format `detail` berupa *List of Objects*. `react-hot-toast` mencoba merender objek ini secara langsung, menyebabkan error `Objects are not valid as a React child`.
- **Solusi:** Menambahkan logika parsing untuk mengubah objek/array error menjadi string yang aman ditampilkan.
```javascript
if (Array.isArray(detail)) {
    errorMessage = detail.map(err => err.msg).join(', ');
} else if (typeof detail === 'object') {
    errorMessage = JSON.stringify(detail);
}
```

### 3. Feature: Global Error Boundary
**File:** `frontend/src/components/ErrorBoundary.jsx` & `frontend/src/main.jsx`
- **Tujuan:** Mencegah aplikasi menjadi blank putih (White Screen of Death) saat terjadi error rendering komponen.
- **Implementasi:** Membuat komponen Class `ErrorBoundary` dan membungkus `App` di `main.jsx`.

### 4. Update: E2E Test Configuration
**File:** `e2e_test.py`
- **Perubahan:** Memperbarui `BASE_URL` dari port 8003 ke 8000 agar sesuai dengan environment yang sedang berjalan.

## Verifikasi
- Request login sekarang dikirim dengan format yang benar.
- Jika terjadi error validasi (misal password kosong), aplikasi tidak akan crash dan akan menampilkan pesan error yang dapat dibaca user.
- Uncaught error akan menampilkan UI fallback yang ramah pengguna dengan tombol refresh.
