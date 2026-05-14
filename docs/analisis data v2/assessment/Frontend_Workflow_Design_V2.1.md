# FRONTEND WORKFLOW DESIGN: GLOBAL ANALISIS DATA V2.1
(Tanggal: 2026-03-05 | Status: Authoritative UX Design)

## 1. PENDAHULUAN
Dokumen ini merancang alur kerja (workflow) frontend yang mentransformasi data kompleks dari [GLOBAL_ANALISIS_DATA.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/GLOBAL_ANALISIS_DATA.md) menjadi visualisasi yang intuitif, responsif, dan aksesibel. Desain ini mengacu pada prinsip HCI (Human-Computer Interaction) dan Usability Heuristics.

---

## 2. ANALISIS KEBUTUHAN & STRUKTUR DATA (IA)
Berdasarkan Stage 0-7, Information Architecture (IA) dibagi menjadi:
- **Global Control Layer**: Pemilihan Board, Range Waktu, dan Granularitas (Context Lock).
- **Data Integrity Layer (Stage 0)**: Visualisasi status kesehatan data mentah (Missing Data, Imputation).
- **Analytical Layer (Stage 1-6)**: Eksplorasi Trend, Korelasi, Kebiasaan, Anomali, dan Health Score.
- **Insight Layer (Stage 7)**: Narasi data (Storytelling) dan rekomendasi tindakan.

---

## 3. WORKFLOW PENGGUNA (FRONTEND JOURNEY)

### 3.1 Langkah 1: Context Definition (Stage 1 Filter)
- **UI Element**: `GlobalControls.jsx` (Sidebar/Header Sticky).
- **Interaction**: User memilih board dan rentang waktu. 
- **HCI Principle**: *Visibility of System Status*. Saat filter diterapkan, sistem mengunci konteks untuk mencegah inkonsistensi data di tab yang berbeda.

### 3.2 Langkah 2: Data Quality Verification (Stage 0)
- **UI Element**: `DataQualityAlert.jsx` & `NormalizationStage.jsx`.
- **Interaction**: Menampilkan badge `accuracy_pct` dan label "Akurasi [X]%".
- **UX Policy**: Sesuai *Transparency Policy* di V2.1, jika akurasi < 100%, sistem wajib menampilkan tooltip penjelasan (Contoh: "Data hanya tersedia 23% dari rentang waktu yang diminta").

### 3.3 Langkah 3: Multi-Stage Exploration (Stage 2-6)
- **UI Element**: Tabbed Navigation (`Tabs.jsx`) yang membagi analisis berdasarkan Stage.
    - **Trend**: Line chart dengan fitur drill-down ke Raw Data.
    - **Health Score**: Gauge chart atau Radar chart untuk Stability, Utilization, dan Anomaly.
- **Interaction**: Transisi antar tab tidak memicu re-fetch data mentah (menggunakan *Shared State*).

### 3.4 Langkah 4: Insight & Recommendation (Stage 7)
- **UI Element**: `ForecastingCard.jsx` & `RcaCard.jsx`.
- **Interaction**: Menampilkan narasi otomatis (Natural Language Generation) berbasis temuan statistik.
- **HCI Principle**: *Recognition rather than recall*. Memberikan kesimpulan langsung daripada memaksa user menginterpretasikan grafik mentah.

---

## 4. PRINSIP DESAIN UI/UX (HCI & USABILITY)

### 4.1 Usability Heuristics (Nielsen)
1.  **Consistency and Standards**: Menggunakan Design System seragam (StatusBadge, StatCard, Button).
2.  **Error Prevention**: Validasi input range waktu agar tidak melampaui retensi data mentah.
3.  **Flexibility and Efficiency of Use**: Shortcut untuk range waktu populer (1H, 1D, 7D, 30D).

### 4.2 Accessibility (WCAG 2.1)
- **Contrast**: Rasio kontras teks minimal 4.5:1.
- **Keyboard Navigation**: Seluruh kontrol dapat diakses menggunakan tombol `Tab`.
- **Screen Reader**: Penggunaan atribut `aria-label` pada grafik dan ikon.

### 4.3 Visual Hierarchy
- **Primary Action**: Tombol "Generate Analysis" dengan warna kontras (Brand Primary).
- **Critical Alerts**: Penggunaan warna Merah/Kuning untuk anomali dan low accuracy data.
- **Grouping**: Penggunaan `Card.jsx` untuk memisahkan metrik yang tidak terkait secara langsung.

---

## 5. MEKANISME FEEDBACK & ERROR HANDLING

- **Loading States**: Penggunaan `LoadingOverlay.jsx` dan Skeleton screens untuk grafik besar.
- **Error States**: `ErrorBoundary.jsx` untuk menangkap kegagalan rendering komponen tertentu tanpa merusak seluruh aplikasi.
- **Success Feedback**: Toast notifications setelah eksekusi batch normalisasi (Stage 0) berhasil.

---

## 6. USABILITY TESTING PLAN

1.  **Task Analysis**: "Temukan penyebab lonjakan trafik pada board X di jam 2 pagi tadi."
2.  **Metrics**: Time on Task, Error Rate, dan System Usability Scale (SUS) score.
3.  **Verification**: Memastikan user memahami label `accuracy_pct` tanpa penjelasan eksternal.

---
**Dirancang Oleh:** Senior Frontend Architect / UI/UX Specialist
**Versi:** 2.1
**Referensi Utama:** [GLOBAL_ANALISIS_DATA.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/GLOBAL_ANALISIS_DATA.md)
