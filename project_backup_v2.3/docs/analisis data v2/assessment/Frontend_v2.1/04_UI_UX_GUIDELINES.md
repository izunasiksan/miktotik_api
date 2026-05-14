# 04: PANDUAN UI/UX & HCI V2.1
**(Tanggal: 2026-03-05 | Fokus: Usability & Aksesibilitas)**

## 1. PENDAHULUAN
Panduan ini merancang antarmuka pengguna (UI) yang mencerminkan kecanggihan pipeline analisis backend namun tetap intuitif bagi pengguna teknis maupun non-teknis.

---

## 2. PRINSIP HCI (HUMAN-COMPUTER INTERACTION)

### **2.1 Nielsen's Usability Heuristics**
1.  **Visibility of System Status**: Gunakan Progress Bar untuk proses normalisasi data Stage 0.
2.  **Match Between System & Real World**: Gunakan istilah jaringan standar (misal: "Traffic Usage", "Latency", "Bandwidth") daripada nama variabel database.
3.  **User Control & Freedom**: Sediakan tombol "Reset Filters" untuk mengembalikan dashboard ke kondisi default.
4.  **Consistency & Standards**: Gunakan palet warna yang konsisten (misal: Merah = Anomali/Critical, Hijau = Normal).

---

## 3. PANDUAN STYLING (DESIGN SYSTEM)

### **3.1 Palet Warna (Brand Palette)**
- **Primary**: Indigo/Blue (`#4F46E5`) - Tombol utama, branding.
- **Success**: Emerald (`#10B981`) - Data akurat, online.
- **Warning**: Amber (`#F59E0B`) - Data accuracy < 100%, warning logs.
- **Danger**: Rose (`#F43F5E`) - Anomali, offline, critical error.
- **Neutral**: Slate (`#F8FAFC`) - Background, card containers.

### **3.2 Tipografi**
- **Sertifikasi Font**: Inter (Sans-serif) untuk keterbacaan data numerik yang tinggi.
- **Hierarchy**:
    - **H1 (Dashboard Title)**: Bold, 24-30px.
    - **H2 (Section Header)**: Semibold, 18-20px.
    - **Body**: Medium, 14-16px.
    - **Caption/Metadata**: Light, 12px.

---

## 4. DESAIN RESPONSIF & ADAPTIF

### **4.1 Breakpoints**
- **Mobile (< 640px)**: Sidebar disembunyikan (hamburger menu), satu kolom per card.
- **Tablet (640px - 1024px)**: Sidebar icons-only, dua kolom per card.
- **Desktop (> 1024px)**: Full sidebar, multi-column dashboard.

### **4.2 Chart Responsiveness**
Seluruh grafik (Echarts/Recharts) harus menggunakan `responsive: true` dan resize listener untuk menyesuaikan ukuran container saat jendela diubah.

---

## 5. AKSESIBILITAS (WCAG 2.1)

1.  **Keyboard Focus**: Seluruh interaksi (Button, Select, Modal) harus memiliki focus ring yang jelas (`outline-primary`).
2.  **Screen Reader**: Gunakan atribut `aria-label` pada elemen visual non-teks (misal: `<HealthGauge aria-label="Skor Kesehatan 85%" />`).
3.  **Contrast Ratio**: Teks harus memiliki rasio kontras minimal 4.5:1 terhadap background.

---

## 6. DATA VISUALIZATION RULES (STORYTELLING)

### **6.1 Trend Exploration**
Jangan hanya menampilkan garis. Tambahkan fitur:
- **Brush/Zoom**: Untuk melihat detail anomali di jam tertentu.
- **Tooltip**: Tampilkan nilai asli + deviasi Z-score (Stage 5).

### **6.2 Insights Display (Stage 7)**
Narasi dari backend (Insights) harus ditampilkan dengan format yang mudah dibaca:
- **Bullet points** untuk temuan.
- **Call-to-Action (CTA)** untuk rekomendasi perbaikan.

---
**Referensi Backend:** [Frontend_Workflow_Design_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Frontend_v2.1/Frontend_Workflow_Design_V2.1.md)
