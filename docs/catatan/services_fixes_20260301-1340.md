Judul: Perbaikan Linter & Ketahanan di app/services
Tanggal: 2026-03-01 13:40

Lingkup Perbaikan:
- alert_manager.py
  - Perbaiki operand kondisional Column[bool] dengan casting eksplisit: gunakan bool(getattr(board, \"is_online\", False)) sebelum pengecekan logika.
- audit_service.py
  - Perbaiki typing parameter default None: ubah signature ke details: dict | None, ip_address: str | None.
- automation_service.py
  - Tangani kemungkinan None pada stdout/stderr: gunakan (result.stdout or \"\").strip() dan (result.stderr or \"\").strip() saat memetakan hasil SSH.
- polling_async_experiment.py
  - Sama seperti di atas: pakai stdout_text = (result.stdout or \"\").strip() untuk pemrosesan output yang aman.
- polling_worker.py
  - Cegah metrics.update(None) saat fetch_sync gagal: jika data None, set metrics[\"is_online\"] = False, panggil alert_manager, lalu keluarkan fungsi lebih awal.
- telegram_service.py
  - Cast nilai ORM (Column) ke tipe native sebelum dipakai:
    - Token: token_str = str(token_value) jika tidak None.
    - Chat ID: chat_id_int = int(str(recipient.chat_id)).

Kepatuhan SOP Backend:
- Asynchronous Non-Blocking I/O: dipertahankan.
- Anti-Spam & Routing: tidak berubah; hanya pengetatan typing.
- SQLAlchemy Async & Pooling: tidak ada perubahan yang melanggar.

Status:
- Diagnostics bersih untuk file-file yang disebutkan.

Catatan:
- Pertahankan pola casting saat berinteraksi dengan atribut ORM (Column) agar aman bagi type checker.

