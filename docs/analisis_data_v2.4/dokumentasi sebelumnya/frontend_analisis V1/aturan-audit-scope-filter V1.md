# Aturan Audit (Scope & Filter)

Dokumen ini menetapkan batasan dan standar untuk mendefinisikan scope dan filter audit. Seluruh proses harus aman, dapat direproduksi, dan mematuhi aturan proyek.

## Prinsip & Larangan
- Read-only: audit tidak boleh memodifikasi data/konfigurasi.
- Dilarang mengeksekusi perintah berisiko tanpa Pre-Flight.
- Dilarang menyimpan/melog data sensitif (PII, secret, token).

## Scope
- Domain: tentukan salah satu—Database / Backend / Frontend / Infrastruktur.
- Entitas: board/interface/PPPoE/hotspot/clients atau unit lain yang relevan.
- Waktu: pilih period (daily/monthly) dan limit, atau rentang tanggal (start/end).
- Konsistensi Bucket: gunakan “Sumber: Server” (Mbps) untuk lintas tab; gunakan “Frontend” untuk fleksibilitas unit non-Mbps.

## Filter
- Periode & Limit: gunakan nilai default yang wajar; hindari limit terlalu besar tanpa alasan.
- Rentang Tanggal: wajib ISO-8601 (`yyyy-MM-dd`), `start ≤ end`.
- Granularity: `auto|year|month|day|hour`. Gunakan `auto` untuk kebanyakan kasus.
- AggMethod (harian): `AVG|MAX|SUM|MIN`. Gunakan `AVG` sebagai default.
- Filter Nama/Entitas: gunakan pencarian case-insensitive, hindari wildcard terlalu luas.

## Validasi & Keamanan
- Jalankan `validateFilterParams` sebelum apply filter.
- Hindari query berat yang tidak perlu (sesuaikan granularity dan rentang).
- Endpoint server-side harus berotentikasi, memvalidasi input, dan memakai caching.

## Logging
- Log operasional hanya menyertakan metainformasi (waktu, id board, jumlah records).
- Jangan menyertakan nilai metrik mentah yang sensitif dalam log.

## Pre-Flight Check (WAJIB)
1) Identifikasi Domain
- Lingkup audit, berkas/komponen terkait, entitas.

2) Dampak & Risiko
- Pengaruh ke performa/pipeline; risiko fallback/mismatch unit.

3) Hasil Audit
- Konsistensi parameter, keamanan endpoint, compliance aturan proyek.

4) Rekomendasi Eksekusi
- Langkah audit, verifikasi, dan strategi rollback (jika ada).

## Checklist
- [ ] Scope jelas (domain/entitas/waktu).
- [ ] Filter tervalidasi (periode/limit/tanggal/granularity/aggMethod).
- [ ] Mode sumber bucket sesuai kebutuhan (Server/Frontend).
- [ ] Read-only terjamin; tidak ada perubahan konfigurasi/DB.
- [ ] Tidak ada data sensitif di log/laporan.
- [ ] Hasil & parameter audit terdokumentasi.

## Rujukan
- Controller & filter: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Validasi filter & util: `frontend/src/pages/analysis/analysis_utils.jsx`
- Halaman audit: `frontend/src/pages/analysis/analysis_audit.jsx`
- Aturan proyek: `docs/aturan-proyek.md`
- Aturan agregasi & alur agregasi: `docs/aturan-agregasi.md`, `docs/agregasi-waktu.md`
