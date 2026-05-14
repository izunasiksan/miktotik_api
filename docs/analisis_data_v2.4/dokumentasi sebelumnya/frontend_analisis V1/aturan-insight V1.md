# Aturan Insight

Dokumen ini menetapkan aturan implementasi untuk halaman Insight: definisi metrik, pemilihan bucket/unit, performa, keamanan, dan UX.

## Ruang Lingkup
- Kartu: Today vs Baseline, Percentiles & Peak, Health Score, Anomali Aktif, Korelasi Penting, Forecast Glimpse, Data Quality, Top Growth/Decline.
- Interaksi kontrol global (periode, tanggal, granularity, aggMethod, sumber bucket).

## Aturan Umum
- API hanya di `src/services/`; logika derivasi di hook khusus.
- Functional components + Tailwind utility-first.
- Wajib Loading Overlay per kartu dan Toast untuk error.

## Bucket & Unit
- Gunakan `bucketSource='server'` untuk konsistensi lintas metrik bila unit=Mbps.
- Untuk unit non‑Mbps, gunakan jalur frontend agar konversi byte-unit akurat.
- Jangan mencampur unit berbeda pada perhitungan insight; lakukan konversi eksplisit lebih dulu.

## Definisi Metrik
- Percentiles: p95/p99 pada rentang aktif; gunakan deret yang telah diselaraskan.
- Peak: nilai maksimum pada rentang; sertakan timestamp puncak.
- Baseline: rata-rata atau median rentang pembanding (mis. periode sebelumnya); definisikan window dengan jelas.
- Delta:
  - DoD: perbandingan hari ke hari sebelumnya (atau bucket setara).
  - WoW: perbandingan terhadap nilai minggu lalu pada bucket yang sama.
- Tren: klasifikasi up/down/flat memakai ambang relatif (mis. ±5–10%). Sesuaikan per metrik.
- Health Score: gabungan faktor (utilisasi, stabilitas, anomali). Skala 0–100, sumber faktor transparan.
- Top Growth/Decline: ranking entitas berdasarkan delta relatif (mis. ((now-prev)/prev)). Tangani prev=0 dengan aturan aman.
- Data Quality: skor kelengkapan/validasi kolom; tampilkan jumlah record hilang/invalid bila relevan.

## Aturan Perhitungan
- Sinkronkan bucket sebelum percentiles/peak/delta. Drop titik yang tidak berpasangan.
- Minimum sampel: tentukan ambang n untuk stabilitas (mis. daily ≥ 12, hourly ≥ 24).
- Gunakan median/MAD untuk baseline robust jika deret ber-noise tinggi.
- Hindari pembagian nol; terapkan guard dan label “tidak terdefinisi” bila perlu.

## UX
- Tampilkan label unit yang jelas dan sumber bucket (Server/Frontend) bila relevan.
- Beri tooltip pada definisi metrik (p95, baseline, WoW) untuk edukasi cepat.
- Sediakan deep-link ke tab Trend/Audit dari kartu Insight.

## Performa
- Gunakan memoization seperlunya; jangan re-hitung derivasi berat tanpa perubahan dependensi.
- Terapkan `dynamicStaleTime` pada query untuk efisiensi.
- Batasi jumlah entitas pada Top list (mis. Top 5/10) agar cepat dan ringkas.

## Keamanan & Logging
- Validasi input filter (tanggal/granularity) sebelum apply; backend memverifikasi ulang.
- Jangan log PII/secret; log operasional menyertakan metainformasi saja.

## Pre-Flight Check (Perubahan Insight)
1) Identifikasi Domain
- Frontend (Insight), Backend (heavy analysis/summary), Database (N/A).

2) Dampak & Risiko
- Konsistensi bucket/unit, kestabilan baseline, performa derivasi.

3) Hasil Audit
- Verifikasi definisi metrik, threshold tren, guard pembagian nol, keamanan input.

4) Rekomendasi Eksekusi
- Uji lint, preview dev; validasi kartu di beberapa periode/granularity/unit.

## Rujukan
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
- UI Insight: `frontend/src/pages/analysis/analysis_insight.jsx`
- Layanan API: `frontend/src/services/api.js`
