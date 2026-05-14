# API MIKROTIK PROJECT DOCUMENTATION

**Dokumen Resmi | Status: STRICT MODE AKTIF**
Dokumen ini berisi aturan mutlak yang WAJIB diprioritaskan dan diikuti oleh AI Assistant (Trae/Gemini) dalam setiap interaksi pada proyek ini untuk memastikan standar kualitas, keamanan, dan konsistensi arsitektur.

================================================================

## LAYER 1 — GLOBAL GOVERNANCE (BEHAVIORAL RULES)

### 1.1 SEVERITY CLASSIFICATION (WAJIB)
AI WAJIB mengklasifikasikan setiap perubahan sebelum memberikan solusi:

**LOW:**
* UI styling
* Typo
* Refactor minor

**MEDIUM:**
* Endpoint baru
* Integrasi API
* Update dependency

**HIGH:**
* Perubahan schema database
* Migrasi Alembic
* Perubahan struktur folder

**CRITICAL:**
* JWT logic
* Password hashing
* DROP/TRUNCATE
* Perubahan .env production

### 1.2 PRE-FLIGHT CHECK PROTOCOL
Sebelum memberikan perintah terminal atau modifikasi besar, AI WAJIB melaporkan:
* Identifikasi Domain (Backend / Frontend / Infra)
* Dampak & Risiko
* Hasil Audit Singkat
* Rekomendasi Eksekusi

### 1.3 SECURITY & DATA INTEGRITY

**Credential Masking:**
* DILARANG menulis kredensial asli.
* Gunakan placeholder: `<REDACTED>`, `<JWT_TOKEN>`, `<DATABASE_URL>`.

**Partial Render:**
* DILARANG mencetak ulang file panjang.
* Gunakan komentar: `// ... kode sebelumnya ...`

**Commit Safety Net:**
* WAJIB mengingatkan "git commit" sebelum perubahan HIGH/CRITICAL.

================================================================

## LAYER 2 — PROJECT SPECIFIC (STACK LOCK)

### 2.1 BACKEND & DATABASE

**Stack:**
* Python 3.11+
* FastAPI (async)
* SQLAlchemy 2.0+ (Async)
* PostgreSQL 15
* Alembic

**Mikrotik Integration:**
* routeros_api
* asyncssh

**Constraint:**
* DILARANG menggunakan Raw SQL untuk CRUD standar.

### 2.2 FRONTEND & UI/UX

**Stack:**
* React 18 (Vite)
* Functional Components ONLY
* Tailwind CSS (NO inline styles)
* Axios

**HCI Mandatory:**
Setiap fitur WAJIB memiliki:
* Loading Indicator
* Confirmation Modal (untuk aksi destruktif)
* Toast Notification

### 2.3 ENVIRONMENT & PATH

**Root Path:**
* E:\API_MIKROTIK_ROOT
* /mnt/e/API_MIKROTIK_ROOT (WSL 2)

**Line Ending:**
* LF ONLY

================================================================

## LAYER 3 — ANTI-HALLUCINATION (VIBE CODING RULES)

### 3.1 CONTEXT ANCHORING

**Logic-First:**
* Untuk tugas kompleks, AI WAJIB menuliskan Pseudocode atau alur logika dalam bentuk poin-poin SEBELUM menulis kode program.

**No Guessing:**
* Jika dokumentasi library tidak tersedia di context, AI WAJIB bertanya/konfirmasi versi, bukan mengarang sintaks.

**Atomic Execution:**
* Batasi modifikasi maksimal 2 fungsi per respons.



### 3.2 VERIFICATION LOOP

**Self-Audit:**
* Setelah coding, AI WAJIB melakukan pengecekan:
  * Undefined variables
  * Unused imports
  * Logic loop error

**Consistency Check:**
* Pastikan nama variabel/fungsi selaras dengan file di folder `app/` atau `src/`.
Query Safety Rule

AI WAJIB:

Menentukan queryKey secara eksplisit

Menjelaskan invalidation strategy sebelum coding

Membatasi maksimal 1 query + 1 mutation per respons

Self-audit:

Duplicate queryKey

Missing invalidation

Missing loading handler

================================================================

## PANDUAN OPERASIONAL AI (STRICT RULES)

================================================================

### KONTROL OUTPUT: AKTIF

**DIIZINKAN:**
* Menampilkan hasil eksekusi tugas
* Baris kode langsung
* Status langkah aktif

**DILARANG:**
* Menampilkan peringatan sistem internal
* Penjelasan panjang tentang cara berpikir AI
* Perubahan konfigurasi di luar konteks

**PRINSIP INTERAKSI (MINIMAL EXPOSURE):**
* Ringkas dan langsung ke solusi.
* Jangan menduplikasi informasi di chat jika sudah ditulis di file log.

**PROTOKOL AKHIR TUGAS (END OF TASK):**
* Setiap solusi final WAJIB diakhiri dengan pertanyaan:
  "Tugas selesai. Apakah Anda ingin saya mengeksekusi trigger dokumentasi untuk perubahan ini?"

================================================================

## 2. FORMAT KODE & STACK TEKNOLOGI (ATURAN MUTLAK)

### A. INFRASTRUKTUR & BACKEND
**Infrastruktur:**
* Docker Compose
* WAJIB limitasi log:
  * max-size: "10m"
  * max-file: "3"

**Framework:**
* FastAPI
* Endpoint I/O WAJIB `async def`

**Koneksi MikroTik:**
* API: `routeros_api`
* SSH: `asyncssh` atau `paramiko`

**Database:**
* PostgreSQL 15
* SQLAlchemy 2.0+ Async + `asyncpg`
* DILARANG Raw SQL untuk CRUD standar
* Migrasi WAJIB Alembic

**Keamanan:**
* Hashing Password: `argon2-cffi`
* JWT: `pyjwt`
* Rate limiting: `slowapi` + Redis 7

**Task Scheduling:**
* HANYA `apscheduler`

### B. FRONTEND
**Framework:**
* React Functional Components ONLY (Kecuali ErrorBoundary)
* DILARANG Class Components (Kecuali ErrorBoundary)

**Styling:**
* HANYA Tailwind CSS
* DILARANG inline style (Kecuali untuk Dynamic Value via CSS Variable)

**HTTP Client:**
* HANYA `axios`

### C. STRUKTUR FOLDER FRONTEND
* UI Reusable: `src/components/`
* API Logic: `src/services/`
* Global State: `src/context/`
src/
 ├── components/
 ├── services/
 ├── hooks/        ← WAJIB untuk custom query hooks
 ├── context/
 Custom hooks seperti:

useUsersQuery

useCreateUserMutation

Tidak boleh tulis query langsung di component besar

### D. STANDAR UI/UX (HCI)
**Visibility of System Status:**
* WAJIB Loading Spinner atau Skeleton

**Error Prevention:**
* WAJIB Modal Konfirmasi untuk aksi destruktif

**Feedback Mechanism:**
* WAJIB Toast Notification

================================================================

## 3. STANDAR TERMINAL & LINGKUNGAN EKSEKUSI

**Terminal Utama:**
* WSL 2 (Ubuntu)

**Format Path:**
* /mnt/e/API_MIKROTIK_ROOT

**Format File:**
* WAJIB LF
* DILARANG CRLF

================================================================

## 4. PROSEDUR VERIFIKASI, REVIEW & AUDIT KODE

**AI DILARANG KERAS:**
* Langsung menimpa file atau mengeksekusi kode tanpa audit menyeluruh,
* BAHKAN jika pengguna meminta FORCE EXECUTE.

### DOMAIN VALIDATION:

**A. DATABASE (.sql)**
* Audit keselarasan dengan SQLAlchemy models
* DILARANG eksekusi langsung ke production
* WAJIB migrasi Alembic
* Blokir DROP/TRUNCATE berisiko

**B. BACKEND (.py)**
* Semua I/O WAJIB async
* Audit dependency vs requirements.txt

**C. FRONTEND (.js/.jsx/.css)**
* Functional Components
* API hanya di `services/`
* Tailwind utility-first
* Wajib Loading & Toast
Stack:
* React 18 (Vite)
* Functional Components ONLY
* Tailwind CSS (NO inline styles)
* Axios
+ TanStack Query (WAJIB menggunakan axios sebagai queryFn)
WAJIB ada global error handler untuk mutation
WAJIB ada fallback UI untuk network error
DILARANG silent error
ATA FETCHING STANDARD

WAJIB:

Semua GET request frontend menggunakan TanStack Query

Semua POST/PUT/DELETE menggunakan useMutation

axios tetap menjadi satu-satunya HTTP client

API logic tetap di src/services/

DILARANG:

fetch() bawaan browser

API call langsung di component

useEffect untuk data fetching baru (kecuali legacy)

Inline async function di dalam useQuery

**PRE-FLIGHT CHECK FORMAT WAJIB:**
* Identifikasi Domain
* Dampak & Risiko
* Hasil Audit
* Rekomendasi Eksekusi

================================================================

## 5. DEPLOYMENT & ROLLBACK
* Migrasi Alembic WAJIB mendukung upgrade dan downgrade
* Fitur berisiko tinggi WAJIB menggunakan Feature Flag (.env)

================================================================

## 6. SISTEM LOGGING & DOKUMENTASI

**A. Trigger /docs**
* AI WAJIB merangkum perubahan terakhir ke `docs/`
* Format: `kategori_YYYYMMDD-HHMM.md`

**B. Logging Internal**
* Direktori: `docs/logchat/`
* Format File: `logchat_YYYYMMDD-HHMM.md`
* Format Isi: `[HH:MM] - [KATEGORI] - [PESAN/KEPUTUSAN]`

**C. Trigger /logchat**
* AI WAJIB membuat ringkasan log tanpa bertanya ulang

**D. Trigger /assessment**
* AI WAJIB merangkum perubahan terakhir ke `assessment/`
* Format: `Assement_kategori_YYYYMMDD-HHMM.md`
================================================================

## 7. FORMAT LAPORAN STANDAR

Jika diminta status, gunakan struktur:
* Ringkasan Eksekutif
* Pencapaian Utama
* Detail Teknis
* Kendala & Mitigasi
* Target Berikutnya
================================================================
# 📋 TECHNICAL FEATURE ASSESSMENT
**Bahasa Indonesia** gunakan bahasa indonesia
**Tanggal:** YYYY-MM-DD
**Target Assessment:** [Nama Fitur / Modul / Endpoint]
**Domain:** [Backend / Frontend / Database / Infra]
**Severity Level:** [LOW / MEDIUM / HIGH / CRITICAL]

---

## 1. DESKRIPSI & TUJUAN
* **Tujuan Fitur:** [Jelaskan singkat apa yang dilakukan fitur ini]
* **Target Pengguna/Sistem:** [Siapa/apa yang mengonsumsi fitur ini]

## 2. AUDIT TEKNOLOGI & STACK (COMPLIANCE CHECK)
* [ ] **Backend:** Menggunakan `async def` (FastAPI)?
* [ ] **Database:** Tidak menggunakan Raw SQL (Menggunakan SQLAlchemy 2.0+)?
* [ ] **Frontend:** Menggunakan Functional Components & Tailwind CSS?
* [ ] **Keamanan:** Tidak ada hardcoded credentials (menggunakan `.env`)?

## 3. ANALISIS RISIKO (RISK ASSESSMENT) 
* **Dampak Sistem:** [Jelaskan komponen apa saja yang terpengaruh]
* **Risiko Downtime:** [Tinggi / Sedang / Rendah]
* **Potensi Breaking Change:** [Apakah memengaruhi endpoint yang sudah dipakai Frontend/Mikrotik?]

## 4. HASIL PENGUJIAN (TESTING RESULTS)
| Kategori Pengujian | Status | Catatan / Temuan |
| :--- | :--- | :--- |
| **Fungsionalitas** | 🟢 Pass / 🔴 Fail | - |
| **Error Handling** | 🟢 Pass / 🔴 Fail | (Misal: Modal Konfirmasi / Toast muncul?) |
| **Load/Log Limit** | 🟢 Pass / 🔴 Fail | (Log tidak melebihi batas 10m) |

## 5. REKOMENDASI & TINDAK LANJUT
* **Keputusan:** [APPROVED / REJECTED / NEEDS REVISION]
* **Rollback Plan:** [Jelaskan langkah jika terjadi kegagalan, misal: `alembic downgrade`]
* **Tugas Lanjutan:**
  1. [Tugas 1]
  2. [Tugas 2]
  3. [Tugas 3]
  4. [Tugas 4]
---
*Assessment dilakukan oleh: [Nama/Peran]*

================================================================

API MIKROTIK PROJECT DOCUMENTATION — FINAL LOCK (ZERO AMBIGUITY EDITION)

================================================================

API MIKROTIK PROJECT DOCUMENTATION
FINAL LOCK — ZERO AMBIGUITY EDITION
STATUS: STRICT MODE ACTIVE

Dokumen ini bersifat mengikat dan tidak membuka ruang interpretasi ganda.
Semua aturan bersifat eksplisit dan presisi.

================================================================

SECTION 1 — DEFINISI RESMI (NO INTERPRETATION ZONE)

1.1 DEFINISI CRUD STANDAR

CRUD Standar adalah operasi:

Create (insert 1 entity)

Read by ID

Read dengan filter sederhana (tanpa CTE / window function)

Update by ID

Delete by ID

CRUD Standar TIDAK termasuk:

CTE (WITH)

Window Function

Materialized View

Query Aggregation kompleks

Performance tuning query

Cross-database query

Raw SQL HANYA diperbolehkan untuk:

Query agregasi kompleks

CTE

Performance optimization khusus

View atau materialized view

Reporting read-only

Selain itu WAJIB menggunakan SQLAlchemy 2.0+ Async ORM.

================================================================

1.2 ATOMIC EXECUTION RULE (REVISED — TOKEN AWARE)

Dalam satu respons AI:

Tidak ada batas maksimal jumlah fungsi yang dimodifikasi.

Berlaku lintas file.
  
File baru tidak dihitung sebagai modifikasi.

Refactor rename tanpa perubahan logic tidak dihitung.

Perubahan LOW severity tidak dihitung.

Yang dihitung sebagai modifikasi signifikan:

Perubahan logic

Perubahan struktur data

Perubahan alur eksekusi

Dokumentasi tidak mengubah klasifikasi severity.

Jika modifikasi mencakup lebih dari 3 fungsi dengan perubahan logic signifikan,
AI WAJIB membagi menjadi beberapa tahap untuk menjaga akurasi dan auditability.

Perubahan HIGH dan CRITICAL tetap mengikuti aturan Pre-Flight dan Approval.

================================================================

1.3 ASYNC SCOPE DEFINITION

WAJIB async:

FastAPI endpoint yang melakukan I/O.

Database access.

Network access (Mikrotik API / SSH / external call).

Scheduler job yang melakukan I/O.

BOLEH sync:

Pure CPU logic.

Utility function tanpa I/O.

Data transformation murni.

DILARANG mencampur sync blocking call dalam async endpoint.

================================================================

1.4 LOGGING RULE SCOPE

Logging otomatis WAJIB jika terjadi:

Perubahan arsitektur

Perubahan schema database

Perubahan security logic

Perubahan deployment strategy

Selain itu:
Logging hanya dilakukan saat trigger:

/docs

/logchat

================================================================

1.5 FILE LENGTH CLASSIFICATION

File dianggap panjang jika:

Lebih dari 150 baris
ATAU

Lebih dari 5 logical section utama

Jika file panjang:
AI WAJIB menggunakan:
// ... kode sebelumnya tetap ...

Jika file ≤150 baris:
Boleh ditampilkan penuh.

================================================================

SECTION 2 — SEVERITY CLASSIFICATION (WAJIB)

AI WAJIB mengklasifikasikan perubahan sebelum memberi solusi.

LOW:

Styling

Typo

Refactor minor tanpa perubahan logic

MEDIUM:

Endpoint baru

Integrasi API

Update dependency

Migrasi Axios Manual → TanStack Query

Penambahan custom hook query

HIGH:

Perubahan schema database

Migrasi Alembic

Perubahan struktur folder
Perubahan global QueryClient config

Perubahan default caching policy

CRITICAL:

JWT logic

Password hashing

DROP / TRUNCATE

Perubahan .env production

Secret key

================================================================

SECTION 3 — PRE-FLIGHT EXECUTION PROTOCOL

Sebelum memberi perintah terminal atau menimpa file:

AI WAJIB menyampaikan:

Identifikasi Domain (Backend / Frontend / Infra / Database)

Dampak & Risiko

Hasil Audit Singkat

Rekomendasi Eksekusi

================================================================
SECTION 4 — EXECUTION LOCK 

AI DILARANG tanpa prosedur:

Menimpa file.

Memberi perintah terminal yang mengubah sistem.

Mengubah konfigurasi production (.env, secret, JWT, DB URL, deployment config).

WAJIB sebelum eksekusi:

Pre-Flight Report.

Persetujuan eksplisit pengguna (contoh: “Approve” / “Lanjut”).

FORCE EXECUTE tetap WAJIB melalui:

Pre-Flight

Approval eksplisit

Tanpa approval → eksekusi diblokir.

================================================================

SECTION 5 — STACK IMMUTABILITY

Stack resmi:

Backend:

Python 3.11+

FastAPI (async)

SQLAlchemy 2.0+ Async

PostgreSQL 15

Alembic

routeros_api

asyncssh

argon2-cffi

pyjwt

slowapi + Redis 7

apscheduler

Frontend:

Stack:
* React 18 (Vite)
* Functional Components ONLY
* Tailwind CSS (NO inline styles)
* Axios
+ TanStack Query (WAJIB menggunakan axios sebagai queryFn)


Aturan:

Minor/Patch update diperbolehkan jika tidak mengubah arsitektur.

Major version upgrade WAJIB Pre-Flight + Approval.

Penggantian library WAJIB Pre-Flight + Approval eksplisit.

Jika library deprecated atau security risk → AI WAJIB merekomendasikan penggantian, bukan langsung mengganti.


================================================================

SECTION 6 — SECURITY ENFORCEMENT

Credential Masking WAJIB:
Gunakan:
<REDACTED>
<JWT_TOKEN>
<DATABASE_URL>

DILARANG menampilkan:

Password asli

Secret key

Token produksi

Connection string asli

================================================================

SECTION 7 — FRONTEND STRUCTURE LOCK

WAJIB:

UI reusable → src/components/
API logic → src/services/
Global state → src/context/

WAJIB HCI:

Loading Indicator

Confirmation Modal (aksi destruktif)

Toast Notification

Identifikasi Domain: Frontend

Query Scope: [Component / Global]

Cache Impact

Refetch Behavior

Invalidation Strategy

Risiko UX

DILARANG:

Inline style

Class component

Axios di luar services/

================================================================

SECTION 8 — TERMINAL & ENVIRONMENT

Terminal utama:
WSL 2 (Ubuntu)

Path:
/mnt/e/API_MIKROTIK_ROOT

Line Ending:
LF ONLY

CRLF DILARANG.

================================================================

SECTION 9 — ANTI-DESTRUCTIVE LOCK

Blokir otomatis jika terdeteksi:

DROP TABLE

TRUNCATE

ALTER destruktif

Overwrite .env production

JWT secret change

Butuh explicit override approval.

================================================================

SECTION 10 — MONITORING ARCHITECTURE (HISTORICAL VS LIVE)

10.1 PEMISAHAN TEGAS (STRICT SEPARATION)
AI WAJIB membedakan antara fitur "Monitoring Historis" dan "Monitoring Live" dalam kode, UI, dan dokumentasi.

A. Monitoring Historis
*   Definisi: Data yang disimpan di database hasil polling background worker.
*   Sumber Data: Database PostgreSQL (`board_resource_stats`, dll).
*   UI Placement: Dashboard (Overview), Reports, Logs.
*   Referensi Alur Kerja: `docs/alur_kerja_monitoring_historis.md`
*   Referensi Aturan: `docs/aturan_monitoring_historis.md`

B. Monitoring Live (Management)
*   Definisi: Data real-time (on-demand) langsung dari router saat user meminta.
*   Sumber Data: RouterOS API (via Backend Proxy).
*   UI Placement: Devices (Detail Tabs: Interfaces, PPPoE, Hotspot), Tools.
*   Referensi Alur Kerja: `docs/alur_kerja_monitoring_live.md`
*   Referensi Aturan: `docs/aturan_monitoring_live.md`

10.2 NAVIGASI FRONTEND
Sidebar WAJIB memisahkan konteks ini secara visual atau struktural untuk mencegah ambiguitas pengguna.
*   Menu "Historical Monitoring": Dashboard, Reports.
*   Menu "Live Management": Devices, Tools, Automation.

================================================================

END OF DOCUMENT
FINAL LOCK — ZERO AMBIGUITY MODE ACTIVE

================================================================