# Laporan Perbaikan Linter Backend
**Tanggal:** 2026-03-01
**Kategori:** Bugfix / Refactor

## Ringkasan
Telah dilakukan perbaikan pada 8 file backend untuk menyelesaikan error linter yang dilaporkan. Perbaikan mencakup type safety, async usage, dan logic error.

## Detail Perubahan

### 1. `app/core/middleware_security.py`
- **Masalah:** `Expression of type "None" cannot be assigned to parameter of type "list[str]"`.
- **Solusi:** Menambahkan pengecekan `if self.allowed_ips` sebelum mengakses elemen.

### 2. `app/scheduler/cron_tasks.py`
- **Masalah:** Type mismatch `Column[int]` ke `int` dan `Column[str]` ke `str`.
- **Solusi:** Casting eksplisit `int()` dan `str()` pada parameter `send_message`.

### 3. `app/api/endpoints/users.py`
- **Masalah:** `Result of async function call is not used` (pada `db.delete`) dan type mismatch.
- **Solusi:** Menghapus `await` pada `db.delete` (sinkron di SQLAlchemy AsyncSession) dan casting `board_name`.

### 4. `app/services/alert_manager.py`
- **Masalah:** `Invalid conditional operand` (pada `is_maintenance`) dan UUID casting.
- **Solusi:** Menggunakan `if getattr(...)` tanpa `is True` dan casting `str(board_id)`.

### 5. `app/services/backup_service.py`
- **Masalah:** `Literal['\n']` type error pada `split`.
- **Solusi:** Explicit type hinting `stdout_str: str`.

### 6. `app/services/polling_worker.py`
- **Masalah:** `RouterOsApiPool` tidak mendukung context manager (`with`).
- **Solusi:** Mengganti dengan `try...finally` block dan `pool.disconnect()`. Membersihkan duplikasi kode.

### 7. `app/services/retention_service.py`
- **Masalah:** `rowcount` tidak dikenali pada `Result`.
- **Solusi:** Menambahkan `.execution_options(synchronize_session=False)` pada statement delete.

### 8. `app/services/telegram_service.py`
- **Masalah:** `Type "Any | None"` ke `str` dan `Invalid conditional operand` pada `alert_levels`.
- **Solusi:** Menggunakan `getattr` dengan default value dan pengecekan list yang aman.

## Status
Semua error linter yang dilaporkan telah diperbaiki.
