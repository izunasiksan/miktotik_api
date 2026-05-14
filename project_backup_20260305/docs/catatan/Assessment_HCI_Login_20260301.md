# Laporan Implementasi HCI pada Login Page
**Tanggal:** 01 Maret 2026
**Status:** ✅ COMPLETED
**Domain:** Frontend (UI/UX)

## 1. Pendahuluan
Dokumen ini merangkum peningkatan antarmuka halaman Login (`Login.jsx`) berdasarkan prinsip-prinsip **Human-Computer Interaction (HCI)** untuk meningkatkan usability, aksesibilitas, dan kepuasan pengguna.

## 2. Prinsip HCI yang Diterapkan

### A. Visibility of System Status (Keterbukaan Status Sistem)
*   **Loading Feedback:** Tombol login kini menampilkan animasi spinner (`Loader2`) dan teks yang berubah ("Signing in..." / "Creating Account...") saat proses berlangsung.
*   **Password Visibility:** Menambahkan fitur "Show/Hide Password" (ikon mata) agar pengguna dapat memverifikasi input mereka sebelum submit.

### B. Error Prevention (Pencegahan Error)
*   **Client-side Validation:** Validasi input dilakukan secara real-time sebelum request dikirim ke server.
*   **Visual Cues:** Input field berubah warna border menjadi merah (`border-red-300`) dan background merah muda (`bg-red-50`) jika ada error, dilengkapi pesan error spesifik di bawah field.

### C. User Control and Freedom (Kontrol Pengguna)
*   **Mode Toggle:** Transisi antara mode "Login" dan "Register" dibuat lebih jelas dan responsif, dengan mereset state error untuk mencegah kebingungan.

### D. Consistency and Standards (Konsistensi)
*   **Iconography:** Menggunakan ikon standar industri (`lucide-react`) untuk User, Lock, Eye, dll.
*   **Focus States:** Menambahkan ring focus biru (`focus:ring-2`) yang konsisten pada semua input interaktif untuk navigasi keyboard yang jelas.

### E. Aesthetic and Minimalist Design (Estetika)
*   **Layout:** Menggunakan desain card yang bersih dengan shadow halus dan transisi hover.
*   **Typography:** Hierarki teks yang jelas antara judul, label, dan instruksi.

## 3. Detail Teknis Perubahan
*   **File:** `frontend/src/pages/Login.jsx`
*   **Library:** `lucide-react` (Icons), `react-hot-toast` (Notifications).
*   **State Management:** Penambahan state lokal `errors` dan `showPassword`.

## 4. Verifikasi
Pengguna dapat memverifikasi perubahan ini dengan:
1.  Membuka halaman Login.
2.  Mencoba submit kosong -> Muncul border merah dan pesan error.
3.  Mengetik password dan klik ikon mata -> Password terlihat/tersembunyi.
4.  Melakukan Login -> Tombol berubah status menjadi loading.

## 5. Rekomendasi Selanjutnya
*   Menambahkan indikator kekuatan password (Password Strength Meter) pada form registrasi.
*   Implementasi "Remember Me" checkbox.
