# RISK ASSESSMENT: BACKUP & RESTORE PROCEDURES

| Versi | Tanggal | Deskripsi | Penulis | Approver | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1.0 | 2026-03-01 | Initial Risk Assessment | AI Assistant | Risk Management | DRAFT |

---

## 1. PENILAIAN RISIKO (RISK ASSESSMENT)
Analisis risiko terhadap proses backup dan restorasi data.

| ID | Risiko | Dampak | Probabilitas | Tingkat Risiko | Strategi Respons | Mitigasi / Kontrol |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R01** | Kegagalan hardware backup | Tinggi | Sedang | MEDIUM | Mitigasi | Redundansi penyimpanan (lokal + cloud) |
| **R02** | Pencurian data backup (Fisik/Online) | Kritis | Rendah | MEDIUM | Mitigasi | Enkripsi AES-256 dan kontrol akses ketat |
| **R03** | Kegagalan integritas data | Tinggi | Sedang | MEDIUM | Mitigasi | Checksum SHA256 dan pengujian restore bulanan |
| **R04** | Kehilangan kunci enkripsi | Kritis | Sangat Rendah | HIGH | Mitigasi | Penyimpanan kunci di HSM atau Vault aman |
| **R05** | Bencana alam (Natural Disaster) | Kritis | Rendah | HIGH | Transfer | Disaster Recovery Site di luar lokasi utama |

## 2. ANALISIS DAMPAK (IMPACT ANALYSIS)
Jika sistem backup gagal total saat terjadi bencana:
*   **Operasional:** Layanan terhenti > 24 jam.
*   **Finansial:** Kehilangan pendapatan dari monitoring router berbayar.
*   **Reputasi:** Kehilangan kepercayaan pengguna terhadap keamanan data.
*   **Legal:** Pelanggaran kepatuhan terhadap standar perlindungan data.

## 3. STRATEGI MITIGASI
1.  **Redundansi 3-2-1:**
    *   3 Salinan data.
    *   2 Media penyimpanan berbeda (Disk, Cloud).
    *   1 Salinan di luar lokasi (Offsite/Cloud).
2.  **Otomatisasi:** Mengurangi human error dalam jadwal backup.
3.  **Monitoring Proaktif:** Alert otomatis jika backup gagal atau integritas file tidak sesuai.

---
*Assessment dilakukan secara berkala setiap 6 bulan atau jika ada perubahan infrastruktur signifikan.*
