# Login UI Redesign (HCI Principles)
**Date:** 2026-03-01
**Time:** 14:25
**Domain:** Frontend (UX/UI)

## 1. Overview
Halaman login telah didesain ulang sepenuhnya untuk mematuhi prinsip-prinsip Human-Computer Interaction (HCI), meningkatkan estetika, dan memberikan pengalaman pengguna yang lebih modern.

## 2. Key Improvements
### A. Visual Hierarchy & Layout (Split Design)
*   **Left Side (Hero):** Menampilkan branding "Mikrotik Manager" dengan latar belakang biru profesional dan pola abstrak jaringan. Memberikan konteks visual yang kuat tentang tujuan aplikasi.
*   **Right Side (Form):** Fokus pada input pengguna dengan ruang putih (whitespace) yang cukup untuk mengurangi beban kognitif.

### B. HCI Principles Applied
1.  **Visibility of System Status:**
    *   Loading spinner (`Loader2`) pada tombol saat submit.
    *   Toast notifications untuk sukses/gagal.
2.  **Match between System and Real World:**
    *   Penggunaan ikon yang familiar (Gembok untuk password, User untuk username, Mata untuk show/hide password).
    *   Bahasa yang jelas ("Masuk Dashboard", "Buat Akun Baru").
3.  **Error Prevention & Recovery:**
    *   Pesan error validasi (inline text merah) muncul langsung di bawah input yang bermasalah.
    *   Input border berubah merah saat error.
4.  **Aesthetics and Minimalist Design:**
    *   Desain bersih tanpa elemen yang tidak perlu.
    *   Warna konsisten (Primary Blue) untuk aksi utama.
5.  **User Control:**
    *   Toggle mudah antara Login dan Register.
    *   Show/Hide password toggle untuk mengurangi kesalahan ketik.

### C. Technical Implementation
*   **Library:** React, Tailwind CSS, Lucide React (Icons).
*   **Responsive:** Layout beradaptasi otomatis (Split screen di Desktop, Stacked di Mobile).
*   **Micro-interactions:** Hover effects pada tombol, focus states pada input.

## 3. Modified Files
*   `frontend/src/pages/Login.jsx`

## 4. Verification
*   **Visual:** Pastikan layout split screen muncul di layar besar dan stack di layar kecil.
*   **Functional:** Test login dan register flow tetap berjalan normal.
*   **Feedback:** Coba submit form kosong untuk melihat validasi error.

## 5. Next Steps
*   Menambahkan fitur "Lupa Password" yang fungsional (saat ini masih placeholder UI).
*   Menambahkan animasi transisi halaman yang lebih halus.
