# DISASTER RECOVERY PLAN (DRP): API MIKROTIK SYSTEM

| Versi | Tanggal | Deskripsi | Penulis | Approver | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1.0 | 2026-03-01 | Initial DR Strategy | AI Assistant | CTO / Security | DRAFT |

---

## 1. PENDAHULUAN
Dokumen ini menetapkan strategi pemulihan sistem saat terjadi bencana alam atau kegagalan total pusat data utama.

## 2. SKENARIO BENCANA ALAM (NATURAL DISASTER)
*   **Gempa Bumi / Kebakaran:** Kehilangan fisik infrastruktur lokal.
*   **Banjir:** Kerusakan perangkat keras dan media penyimpanan lokal.
*   **Pandemi / Konflik:** Keterbatasan akses fisik ke lokasi utama.

## 3. STRATEGI DISASTER RECOVERY
### 3.1 Failover Mechanisms
*   **Primary Site:** Data Center Lokal (Jakarta).
*   **Secondary Site:** Cloud Provider / Remote Site (Singapura).
*   **DNS Failover:** Pengalihan trafik otomatis via Cloudflare jika site utama offline > 5 menit.

### 3.2 Data Replication
*   **Database:** Replikasi Master-Slave asinkron via SSL/TLS.
*   **File Assets:** Rsync harian ke cloud storage terenkripsi.

## 4. PROSEDUR KOMUNIKASI & ESKALASI
### 4.1 Matriks Eskalasi
| Peran | Tanggung Jawab | Media Komunikasi |
| :--- | :--- | :--- |
| **System Admin** | Identifikasi Awal & Trigger DR | WhatsApp / Telegram / Email |
| **Security Team** | Verifikasi Integritas Data | Signal (End-to-End Encrypted) |
| **Management** | Keputusan Aktivasi Failover | Zoom / Meet / Telepon |

### 4.2 Alur Komunikasi
1.  **DETEKSI:** Monitoring alert mengirim notifikasi kegagalan site.
2.  **VERIFIKASI:** Admin melakukan pengecekan fisik/remote dalam 15 menit.
3.  **DEKLARASI:** Jika site utama rusak permanen, deklarasikan BENCANA.
4.  **AKTIVASI:** Jalankan script failover ke secondary site.
5.  **PENGUMUMAN:** Informasikan status sistem ke seluruh stakeholder.

## 5. RENCANA PEMULIHAN (RECOVERY TIMELINE)
*   **T+0:** Deteksi Insiden.
*   **T+30m:** Deklarasi Bencana & Aktivasi DR.
*   **T+2h:** Pemulihan database dan layanan inti di Secondary Site.
*   **T+4h:** Verifikasi aplikasi dan pembukaan akses publik (RTO Tercapai).

## 6. JADWAL PENGUJIAN (TESTING SCHEDULE)
*   **Quarterly DR Drill:** Simulasi pemutusan site utama dan failover ke site sekunder.
*   **Review:** Laporan hasil pengujian harus diserahkan ke manajemen maksimal 5 hari setelah simulasi.

---
*Dokumen ini bersifat RAHASIA dan KRITIS.*
