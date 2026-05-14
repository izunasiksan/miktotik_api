# Aturan Proyek & Prosedur Verifikasi/Audit

Dokumen ini merangkum aturan kerja, standar implementasi, serta format pre-flight check yang wajib diikuti pada repository ini.

## Larangan Keras

- Dilarang menimpa file atau mengeksekusi kode tanpa audit menyeluruh, bahkan jika diminta “force execute”.
- Dilarang menyimpan atau melog kredensial, token, atau secret ke dalam kode maupun repositori.
- Dilarang menjalankan perintah destruktif terhadap data produksi.

## Validasi per Domain

### Database (.sql)
- Wajib audit keselarasan dengan SQLAlchemy models.
- Dilarang eksekusi langsung ke production.
- Wajib gunakan migrasi Alembic untuk perubahan skema.
- Blokir operasi berisiko tinggi (DROP/TRUNCATE) kecuali melalui prosedur migrasi terkontrol.

### Backend (.py)
- Semua I/O wajib async (request handler, DB, cache, network).
- Audit dependency terhadap `backend/requirements.txt`; hindari dependency “siluman”.
- Pastikan penanganan error terstandarisasi (HTTPException, validasi input).
- Hindari logging data sensitif di server.

### Frontend (.js/.jsx/.css)
- Gunakan Functional Components.
- Pemanggilan API hanya di `src/services/`.
- TailwindCSS utility-first untuk styling.
- Wajib menyediakan Loading state dan Toast untuk feedback interaksi.
- Jalankan lint sebelum merge: `npm run lint` (frontend).

## Pre-Flight Check (WAJIB)

Gunakan template berikut sebelum mengeksekusi perubahan signifikan atau menjalankan skrip yang berpengaruh pada data/produksi.

1) Identifikasi Domain
- Lingkup: Database / Backend / Frontend / Infrastruktur
- Berkas/Modul terkait: …

2) Dampak & Risiko
- Dampak ke user/operasional: …
- Risiko teknis & mitigasi: …

3) Hasil Audit
- Pengecekan dependency: …
- Konsistensi skema/tipe data: …
- Keamanan & compliance: …

4) Rekomendasi Eksekusi
- Rencana eksekusi (langkah, urutan, rollback): …
- Langkah verifikasi (lint/tests/manual): …

## Praktik Keamanan

- Jangan menyimpan secret di kode; gunakan environment variable atau secret manager.
- Hindari mencetak data rahasia ke log (password, token, kunci API).
- Validasi input dan sanitasi data pada boundary (HTTP, DB, file I/O).

## Kualitas Kode

- Ikuti pola yang sudah ada pada project (penamaan, struktur folder, utilities).
- Hindari perubahan lintas berkas yang tidak relevan dengan task.
- Pastikan perubahan diverifikasi:
  - Frontend: lint (`npm run lint`) dan verifikasi UI (preview dev server).
  - Backend: verifikasi endpoint (manual/e2e), pastikan tidak memblokir event loop (async).
  - Database: perubahan skema via Alembic migration.

## Catatan Implementasi Agregasi Waktu

- Sumber bucket waktu:
  - Frontend: agregasi & standardisasi di browser.
  - Server: bucket dari endpoint agregasi waktu untuk konsistensi lintas tab.
- Toggle “Sumber” pada Global Controls: Frontend | Server.
- Traffic server dalam Mbps; jika unit bukan Mbps, frontend fallback agar konversi satuan benar.
- Detail arsitektur: [docs/agregasi-waktu.md](file:///e:/mikrotik_api/docs/agregasi-waktu.md)

## Rujukan Berkas

- Controller & state global: [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
- Hook derivasi: [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx)
- Layanan API: [api.js](file:///e:/mikrotik_api/frontend/src/services/api.js)
- Kontrol global UI: [GlobalControls.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/components/GlobalControls.jsx)
