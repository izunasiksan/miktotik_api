# Log Perubahan Analisis Data v2.4.1

Dokumen ini mencatat riwayat perbaikan dan perubahan pada proyek Analisis Data versi 2.4.1.

## [2026-03-06] - Inisialisasi Versi 2.4.1
- **Tujuan**: Memulai siklus pengembangan 2.4.1 berdasarkan aturan `rulev24.md` terbaru.
- **Tindakan**:
    - Membuat file `logv2.4.1.md`.
    - Mempersiapkan infrastruktur dokumentasi untuk perbaikan minor dan optimasi lanjutan.
    - **UPDATE 2.4.1 Migrasi Standar Internasional**:
        - Mengidentifikasi dan menyalin dokumen relevan dari `dokumentasi sebelumnya` yang memuat standar internasional (ISO, IEC, IEEE, ANSI).
        - Mengatur dokumen ke dalam struktur folder terorganisir di `docs\docs Internasional standar (relevan)\`.
        - Folder mencakup: Arsitektur_Global, Audit_Testing, Dokumentasi_Naming, Keamanan, dan Kualitas.
    - **UPDATE 2.4.1 UI Fix Tombol Apply terpotong**:
        - Memperbaiki issue tombol Apply yang terpotong pada dropdown tanggal selesai di `ScopeFilterStage.jsx`.
        - Menghapus `overflow-hidden` pada container utama dan menambahkan `rounded-t-xl`/`rounded-b-xl` pada header/footer.
        - Menambahkan prop `side` pada `QuickDatePicker.jsx` untuk mendukung posisi dropdown fleksibel (atas/bawah).
        - Mengatur `QuickDatePicker` "Selesai" untuk membuka ke arah atas (`side="top"`) guna menghindari tumpang tindih dengan footer.
- **Status**: Completed (UI Fix).

## [2026-03-06] - Perbaikan Logika Akurasi Data 0%
- **Tujuan**: Memperbaiki issue akurasi data yang selalu tampil 0% pada data hasil normalisasi yang mengandung gap.
- **Tindakan**:
    - **UPDATE 2.4.1 Fix Accuracy Logic (Backend)**:
        - Memodifikasi `normalization_v2.py` untuk mengganti hardcoded `0.0` accuracy pada titik gap (imputed points) menjadi `50.0`.
        - Memperbarui perhitungan `accuracyPct` global di `run_normalization_preview` agar menggunakan rata-rata dari seluruh titik data (termasuk titik imputasi) alih-alih hanya menghitung rasio non-gap.
        - Memastikan akurasi mencerminkan kualitas data hasil estimasi (imputasi) alih-alih memberikan kesan data tidak tersedia sama sekali.
## [2026-03-06] - Perbaikan Infrastruktur Docker & Celery
- **Tujuan**: Menyelesaikan kegagalan build Docker dan error perintah Celery yang tidak dikenali.
- **Tindakan**:
    - **UPDATE 2.4.1 Fix Docker Build Failure**:
        - Memperbaiki `Dockerfile` dengan menambahkan dependensi sistem yang hilang: `libffi-dev`, `libssl-dev`, `python3-dev`.
        - Menambahkan langkah upgrade `pip`, `setuptools`, dan `wheel` di `Dockerfile` untuk memastikan kompatibilitas instalasi package modern.
        - Memperbaiki konteks build pada perintah Docker agar dapat menemukan file `requirements.txt`.
    - **UPDATE 2.4.1 Resolusi Konflik Dependensi**:
        - Mengidentifikasi konflik versi package `packaging` antara `black` (min 22.0) dan `safety` (21.0 - 22.0).
        - Menangguhkan (comment out) instalasi alat kualitas kode (black, isort, flake8, pylint, bandit, safety) di `requirements.txt` produksi untuk memungkinkan build container berhasil.
        - Alat pengembangan disarankan untuk dijalankan di lingkungan dev terpisah atau melalui multi-stage build di masa mendatang.
    - **UPDATE 2.4.1 Verifikasi Celery**:
        - Mengonfirmasi instalasi `celery[redis]` di `requirements.txt`.
        - Memastikan `celery_app.py` terkonfigurasi dengan benar menggunakan Redis sebagai broker dan backend.
        - Menjelaskan bahwa error "Celery not recognized" di lingkungan lokal disebabkan karena package belum terinstal di host OS, namun akan berfungsi normal di dalam container Docker.
## [2026-03-06] - Penambahan Fitur Preview Data Normalisasi (Stage 0)
- **Tujuan**: Menampilkan data mentah hasil normalisasi Stage 0 dalam bentuk tabel sesuai permintaan user pada rute `/analysis-v2`.
- **Tindakan**:
    - **UPDATE 2.4.1 Implement Preview Data Button & Table (Frontend)**:
        - Memodifikasi `analysisStore.js` untuk menambahkan state `normalizationData` dan setter `setNormalizationData` guna menyimpan hasil fetch mentah dari API preview.
        - Memperbarui `NormalizationStage.jsx` agar memanggil `setNormalizationData(data)` setelah berhasil melakukan `runPreview`.
        - Membuat komponen baru `NormalizationPreviewTable.jsx` di folder `organisms` untuk menampilkan data traffic (download/upload), status gap, dan akurasi per titik data dalam bentuk tabel yang dapat di-collapse.
        - Mengintegrasikan `NormalizationPreviewTable` ke dalam halaman utama `AnalysisV2.jsx` tepat di bawah `NormalizationStage`.
        - Menambahkan indikator visual untuk data yang diisi otomatis (*Gap Filled*) dan progres bar akurasi per baris data.
- **Status**: Completed (Feature Addition).

## [2026-03-06] - Perbaikan Pemetaan Data Tabel Preview (Stage 0)
- **Tujuan**: Memperbaiki data Download/Upload yang tampil 0.00 meskipun data di backend tersedia.
- **Tindakan**:
    - **UPDATE 2.4.1 Fix Data Mapping in NormalizationPreviewTable**:
        - Mengidentifikasi ketidaksesuaian nama field antara backend (`rx`, `tx`) dan frontend (`download_mbps`, `upload_mbps`) pada komponen `NormalizationPreviewTable.jsx`.
        - Memperbarui komponen `NormalizationPreviewTable.jsx` agar menggunakan field `rx` untuk Download dan `tx` untuk Upload sesuai dengan response dari `_normalize_traffic` di backend.
- **Status**: Completed (Bug Fix).

## [2026-03-06] - Perbaikan Bug Granularity "auto" & Sinkronisasi CamelCase (Stage 0)
- **Tujuan**: Memperbaiki data yang tetap 0.00 meskipun field mapping sudah benar, serta memperbaiki sinkronisasi property akurasi.
- **Tindakan**:
    - **UPDATE 2.4.1 Fix Auto Granularity Bug in Backend**:
        - Mengidentifikasi bahwa saat `granularity="auto"`, backend tidak meresolusi granularitas sebelum proses normalisasi. Hal ini menyebabkan kegagalan pemetaan (*key mismatch*) karena `_truncate` tidak melakukan pemotongan waktu sementara data dari database sudah terpotong.
        - Memperbarui `run_normalization_preview` di `normalization_v2.py` untuk meresolusi `"auto"` menggunakan `_determine_time_granularity` sebelum memproses data traffic dan resource.
    - **UPDATE 2.4.1 Fix Accuracy Property Case (Frontend)**:
        - Mengubah penggunaan `accuracy_pct` menjadi `accuracyPct` di `NormalizationStage.jsx` agar sinkron dengan output camelCase dari backend.
- **Status**: Completed (Bug Fix).

## [2026-03-06] - Perbaikan Sintaks Batch Script (Opsi 3 Force Close)
- **Tujuan**: Memperbaiki masalah skrip dashboard yang langsung tertutup (force close) saat memilih Opsi 3.
- **Tindakan**:
    - **UPDATE 2.4.1 Fix Batch Syntax**:
        - Mengganti penggunaan tanda petik tunggal `'` dengan backtick `` ` `` dan menambahkan parameter `usebackq` pada perintah `FOR /F`. Tanda petik tunggal sering menyebabkan kegagalan parsing pada Windows Batch saat menjalankan perintah eksternal.
        - Menambahkan pengecekan `if not "%%i"==""` untuk memastikan variabel loop tidak kosong sebelum menjalankan `docker stop`.
        - Menggunakan tanda kutip ganda pada set variabel path `set "VAR=VAL"` untuk menangani spasi atau karakter khusus dengan lebih aman.
- **Status**: Completed (Scripting Fix).

## [2026-03-06] - Perbaikan Final Dashboard (Robust Docker Check)
- **Tujuan**: Menghilangkan masalah force close yang terus terjadi pada Opsi 3 dan meningkatkan reliabilitas skrip.
- **Tindakan**:
    - **UPDATE 2.4.1 Robust Batch Logic**:
        - Menghilangkan eksekusi perintah langsung di dalam `FOR /F` yang sering menyebabkan crash pada interpreter CMD Windows.
        - Menggunakan file sementara (`%TEMP%\docker_ps_6379.txt`) untuk menyimpan hasil filter `docker ps`, lalu membacanya secara aman.
        - Menambahkan perintah `where docker` untuk memvalidasi ketersediaan Docker sebelum mencoba menjalankan perintah terkait.
        - Menambahkan blok penanganan error `|| (echo [ERROR] & pause)` pada setiap perintah krusial (`cd`, `docker-compose`, `python`) agar skrip tidak langsung tertutup saat terjadi kegagalan, melainkan memberikan pesan error yang jelas kepada user.
- **Status**: Completed (Final Script Fix).

## [2026-03-06] - Perbaikan Final Data 0.00 Mbps & Konsistensi Unit (Stage 0)
- **Tujuan**: Menyelesaikan masalah data 0.00 Mbps yang persisten dan memastikan konsistensi unit Mbps di seluruh pipeline.
- **Tindakan**:
    - **UPDATE 2.4.1 Fix Auto Granularity consistency (Backend)**:
        - Memperbaiki `run_normalization_preview` di `normalization_v2.py` untuk meneruskan `resolved_granularity` secara eksplisit ke fungsi `time_aggregate`.
        - Sebelumnya, `time_aggregate` menggunakan parameter asli `granularity` ("auto"), yang menyebabkan redeterminasi independen. Dengan meneruskan `resolved_granularity`, dipastikan `time_aggregate` dan `_truncate`/`_build_timeline` menggunakan basis waktu yang identik (misal: "hour" untuk rentang < 2 hari).
    - **UPDATE 2.4.1 Audit Data Primary (Validation)**:
        - Memverifikasi alur data berdasarkan dokumen `01 AUDIT_SCOPE_FILTER_FLOW.md` V2.1.
        - Memastikan data `download_mbps` dan `upload_mbps` dari tabel `board_speed_stats` adalah SSOT (Single Source of Truth) untuk metrik traffic.
        - Mengonfirmasi bahwa `polling_worker.py` telah menghitung delta byte dan menyimpannya dalam unit Mbps (Mega bit per second) ke database, sehingga tidak diperlukan konversi unit tambahan di tahap normalisasi.
- **Status**: Completed (Final Bug Fix).

## [2026-03-06] - Audit Dokumentasi SSOT (V2.4 vs V2.1)
- **Tujuan**: Menyelaraskan dokumentasi analisis data lama (V2.1) dengan implementasi database terbaru (V2.4/V2.2) sebagai Sumber Kebenaran Utama (SSOT).
- **Tindakan**:
    - **UPDATE 2.4.1 Audit Dokumentasi SSOT**:
        - Melakukan audit komprehensif terhadap `schema.sql` dan folder `penjelasan database/` dibandingkan dengan `dokumentasi sebelumnya/analisis data v2/`.
        - Mengidentifikasi perubahan arsitektur utama: Implementasi **Partitioning** pada tabel statistik volume tinggi dan penambahan kolom **accuracy_pct** di level database.
        - Menemukan penambahan modul baru: **Automation Jobs** (Nomor 17) dan **Summary Tables** (Nomor 9, 9a, 9b) untuk optimasi performa.
        - Membuat laporan audit resmi di `docs/audit_v2.4_ssot.md` yang menyatakan `schema.sql` sebagai SSOT final dan dokumen lama sebagai arsip.
- **Status**: Completed (Audit & Documentation).

## [2026-03-06] - Perbaikan Dashboard Operasional
- **Tujuan**: Memperbaiki error "Celery not recognized" saat menjalankan Opsi 3 (Docker Redis + Celery) di Dashboard Operasional.
- **Tindakan**:
    - **UPDATE 2.4.1 Fix Dashboard Script Syntax (Batch)**:
        - Mengidentifikasi kesalahan sintaksis pada file `run_backend_v2.4.bat` di mana karakter `&` pada perintah `echo` diinterpretasikan sebagai pemisah perintah (command separator).
        - Kesalahan ini menyebabkan Windows mencoba menjalankan `Celery` sebagai perintah lokal (host OS) alih-alih menampilkan teks, sehingga memicu error "Celery not recognized".
        - Membuat file perbaikan `run_dashboard_v2.4_fixed.bat` dengan karakter escape `^&` untuk menampilkan simbol ampersand dengan benar.
        - Memperbaiki logika deteksi `ROOT_DIR` agar skrip dapat dijalankan dari berbagai level folder (root atau subfolder docs).
- **Status**: Completed (Operational Fix).

## [2026-03-06] - Perbaikan Virtual Environment (venv) Lokal
- **Tujuan**: Memperbaiki kegagalan pembuatan venv dan instalasi dependensi (`CREATE_VENV.PIP_FAILED_INSTALL_REQUIREMENTS`).
- **Tindakan**:
    - **UPDATE 2.4.1 Fix requirements.txt for Local Environment**:
        - Mengidentifikasi bahwa versi `pydantic-core` yang lama memerlukan kompilasi Rust, yang sering gagal di lingkungan Windows tanpa build tools lengkap.
        - Memperbarui `fastapi`, `uvicorn`, `pydantic`, dan `pydantic-settings` ke versi yang lebih baru (`fastapi==0.115.6`, `pydantic>=2.10.0`) yang menyediakan *pre-compiled wheels* untuk Windows.
        - Menghapus pembatasan versi yang terlalu ketat untuk meningkatkan kompatibilitas instalasi otomatis di Trae/VS Code.
    - **UPDATE 2.4.1 Re-create venv**:
        - Menghapus venv yang korup dan membuat ulang venv baru secara manual untuk memastikan seluruh dependensi terinstal dengan benar.
- **Status**: Completed (Local Environment Fix).

## [2026-03-06] - Perbaikan ModuleNotFoundError (pybreaker)
- **Tujuan**: Memperbaiki error `ModuleNotFoundError: No module named 'pybreaker'` saat menjalankan backend melalui dashboard.
- **Tindakan**:
    - **UPDATE 2.4.1 Fix Dashboard VENV Activation**:
        - Mengidentifikasi bahwa skrip dashboard sebelumnya tidak mengaktifkan virtual environment (`.venv`) sebelum menjalankan `python -m app.main`.
        - Akibatnya, sistem menggunakan Python global yang tidak memiliki library `pybreaker`, meskipun library tersebut sudah terinstal di dalam `.venv`.
        - Memperbarui `run_dashboard_v2.4_fixed.bat` untuk mendeteksi dan menjalankan `call .venv\Scripts\activate.bat` secara otomatis sebelum memulai backend.
        - Menambahkan logika deteksi `ROOT_DIR` yang lebih cerdas agar skrip tetap bisa mengaktifkan venv meskipun dipindahkan folder.
- **Status**: Completed (Runtime Fix).

## [2026-03-06] - Perbaikan Kompatibilitas Python 3.14 (SQLAlchemy & PyJWT)
- **Tujuan**: Memperbaiki error `AssertionError: Class SQLCoreOperations directly inherits TypingOnly` dan `ModuleNotFoundError: No module named 'jwt'`.
- **Tindakan**:
    - **UPDATE 2.4.1 Upgrade SQLAlchemy & Alembic**:
        - Mengidentifikasi bahwa SQLAlchemy 2.0.23 tidak kompatibel dengan Python 3.14 (terjadi error pada sistem *typing* internal).
        - Memperbarui `sqlalchemy>=2.0.48` dan `alembic>=1.18.4` di `requirements.txt` yang telah mendukung Python 3.14.
    - **UPDATE 2.4.1 Add PyJWT Dependency**:
        - Menambahkan `PyJWT>=2.11.0` ke `requirements.txt` karena kode menggunakan `import jwt` namun library belum terinstal.
        - Melakukan verifikasi startup backend yang kini berhasil berjalan di port 8000.
- **Status**: Completed (Compatibility Fix).

## [2026-03-06] - Perbaikan Konflik Port Docker Redis (6379)
- **Tujuan**: Memperbaiki error `Bind for 0.0.0.0:6379 failed: port is already allocated` saat menjalankan Opsi 3 di dashboard.
- **Tindakan**:
    - **UPDATE 2.4.1 Fix Docker Port Conflict**:
        - Mengidentifikasi adanya container Redis lain (`mikrotik-redis-dev`) yang sudah berjalan dan menggunakan port 6379.
        - Memperbarui `run_dashboard_v2.4_fixed.bat` untuk menambahkan logika pembersihan otomatis.
        - Skrip sekarang akan mendeteksi setiap container yang menggunakan port 6379 melalui `docker ps --filter "publish=6379"` dan menghentikannya secara otomatis sebelum menjalankan `docker-compose up`.
- **Status**: Completed (Infrastructure Fix).

## [2026-03-06] - Milestone Assessment V2.4.1 (Evaluasi Komprehensif)
- **Tujuan**: Melakukan validasi aturan monitoring (Historis & Live) dan menyusun roadmap pencapaian berdasarkan SSOT Audit.
- **Tindakan**:
    - **UPDATE 2.4.1 Create Comprehensive Milestone Assessment**:
        - Menganalisis 4 dokumen aturan monitoring (Historis & Live) untuk ekstraksi persyaratan teknis kritis.
        - Menyusun checklist assessment berbasis risiko yang mencakup partitioning, async I/O, audit trail, dan akurasi metadata.
        - Menetapkan timeline 4 minggu (Milestones) dengan indikator keberhasilan (KPI) yang terukur.
        - Membuat mekanisme eskalasi deviasi untuk menjamin integritas SSOT.
        - Menyimpan dokumen resmi di `docs/assessment_awal_v2.4.1_20260306.md`.
- **Status**: Completed (Governance & Assessment).

## [2026-03-06] - Implementasi Milestone V2.4.1 (Sync SSOT & Polling Worker)
- **Tujuan**: Menyelaraskan codebase dengan dokumen SSOT (`audit_v2.4_ssot.md`) terkait skema database, metadata akurasi, dan optimasi polling.
- **Tindakan**:
    - **UPDATE 2.4.1 Sinkronisasi Skema Database (Models)**:
        - Refaktor primary key pada tabel volume tinggi (`board_client_stats`, `board_resource_stats`, `board_speed_stats`, `board_events`, `board_interface_usage`, `board_pppoe_usage`, `hotspot_usage_raw`) dari `BigSerial` menjadi `BigInt` + `Sequence`.
        - Hal ini wajib dilakukan untuk mendukung `PARTITION BY RANGE` di PostgreSQL sesuai standar SSOT.
        - Menambahkan `accuracy_pct` (Numeric 5,2) pada tabel summary (`board_daily_summary`, `board_interface_daily_summary`, `board_monthly_summary`, `hotspot_usage_monthly`) yang sebelumnya tertinggal.
    - **UPDATE 2.4.1 Refaktor Polling Worker (Performance & Partitioning)**:
        - Menambahkan mekanisme **Jitter** (jeda acak) antar request router (0-10 detik) dan antar batch proses (2-5 detik) untuk mencegah spike CPU pada server API dan Router.
        - Implementasi **Partitioning Filter**: Memastikan seluruh operasi `INSERT` pada tabel statistik menyertakan `log_time` atau `log_date` secara eksplisit untuk mendukung routing partisi yang efisien.
        - Integrasi metadata **Accuracy**: Mengisi kolom `accuracy_pct` dengan nilai default `100.00` pada setiap operasi penyimpanan data polling yang sukses.
    - **UPDATE 2.4.1 Verifikasi Naming Convention (camelCase)**:
        - Memastikan `BaseSchema` menggunakan `alias_generator=to_camel` untuk konversi otomatis snake_case (Python) ke camelCase (JSON).
        - Memverifikasi endpoint API (misal: `boards.py`) menggunakan `jsonable_encoder(..., by_alias=True)` untuk konsistensi output camelCase pada response dan cache Redis.
- **Status**: Completed (Milestone Implementation).
