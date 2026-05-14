
## Update: Verifikasi User Developer (2026-03-01 10:05)

### Masalah
User melaporkan kegagalan login dengan pesan `401 Unauthorized` untuk kredensial `developer/developer123`, meskipun script verifikasi database menunjukkan user ada dan password benar.

### Investigasi
1.  **Database Verification**: Script `check_user_script.py` mengonfirmasi user `developer` memiliki role `admin`, status `active`, dan hash password valid untuk `developer123`.
2.  **API Verification**: Script `test_login.py` dijalankan terhadap server *fresh instance* pada port 8001 dan berhasil login (200 OK).
3.  **Running Server Issue**: Server backend yang sedang berjalan (port 8000) menolak login yang sama (401 Unauthorized).

### Kesimpulan
Backend server yang sedang berjalan mengalami kondisi *stale* (tidak sinkron dengan kode/db terbaru) atau mengalami masalah cache internal.

### Solusi
Restart backend server (`uvicorn` / `python main.py`) diperlukan untuk memuat ulang konfigurasi dan koneksi database yang benar.

### Status
- [x] Login Interceptor Fixed
- [x] Login Button Accessibility Fixed
- [x] Developer Credentials Verified
- [x] Backend Code Verified
- [ ] User perlu restart backend server
