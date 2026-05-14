# Analisis V2 — Penanganan 401 dan Perubahan Auto Logout

Tujuan dokumen ini adalah menjelaskan permasalahan 401 Unauthorized yang memicu auto logout saat mengakses endpoint analitik, beserta perubahan dan pedoman baru agar sesi pengguna lebih stabil tanpa mengorbankan keamanan.

## Latar Belakang
- Terlihat di log: 401 Unauthorized pada request aggregate analitik, misalnya:
  - GET …/analysis/{board_id}/aggregate/?…metric=download_mbps&agg=avg → 401
- Sebelum perbaikan, seluruh 401 di interceptors menyebabkan penghapusan token dan redirect ke halaman login. Akibatnya, user otomatis logout walaupun 401 terjadi pada endpoint non-auth (mis. analitik).
- Analisis V2 juga memiliki fallback ke V1 jika endpoint V2 aggregate-all belum tersedia. Saat fallback dipanggil dengan sesi bermasalah, 401 dapat terjadi dan memicu auto logout.

## Gejala
- Tiba-tiba logout saat memuat data Analisis V2.
- Toast error 401 lalu diarahkan ke /login meskipun hanya memanggil endpoint analitik.
- Pada kasus lain sebelumnya, 422 sempat terjadi karena pemetaan metric CPU ke V1 tidak valid (sudah diperbaiki).

## Akar Masalah
- Interceptor menganggap seluruh 401 sebagai tanda sesi berakhir dan langsung menghapus token. Padahal, 401 juga bisa muncul karena:
  - Token tidak ikut terkirim (misconfig antar tab/sesi).
  - Token kedaluwarsa pada panggilan non-auth yang tidak krusial.
  - Fallback ke V1 saat fitur V2 belum tersedia.
- Tidak ada mekanisme refresh token; logout total di setiap 401 membuat pengalaman pengguna terganggu.

## Solusi
1. Ubah perilaku interceptor V1 dan V2:
   - Hanya endpoint verifikasi profil `/auth/me/` yang memicu auto logout saat 401.
   - Untuk 401 di endpoint non-auth, tampilkan notifikasi “Akses ditolak (401)” dengan throttle (maks. sekali/5 detik), tanpa menghapus token.
2. Tambahkan kontrol reload dan efek visual (HCI) di Analisis V2:
   - Tombol “Reload Data” untuk memaksa re-fetch seluruh query V2.
   - Indikator loading dan highlight “data updated” agar status jelas.
3. Perbaikan fallback metric:
   - Gunakan `cpu_load` untuk fallback CPU ke V1 agar tidak memicu 422.
4. Cache ketersediaan endpoint V2 aggregate-all di `sessionStorage` (kunci `V2_AGG_ALL_AVAILABLE`) agar tidak menimbulkan 404/501 berulang.

## Dampak
- Keamanan tetap terjaga: token hanya dihapus saat `/auth/me/` mengembalikan 401 (penanda sesi berakhir).
- UX membaik: 401 non-auth tidak memutus sesi; pengguna dapat memperbaiki filter atau me-reload data.
- Mengurangi frustrasi akibat auto logout yang tidak perlu.

## Cara Reproduksi
1. Login dan buka halaman Analisis V2.
2. Paksa kondisi 401 pada endpoint analitik (misal dengan mematikan token lewat DevTools sementara).
3. Amati:
   - Muncul toast “Akses ditolak (401). Coba reload atau login ulang.”
   - Tidak ada auto redirect ke /login.
4. Uji `/auth/me/` dengan token invalid:
   - Harus logout otomatis dan diarahkan ke /login.

## Verifikasi
- Gunakan tombol “Reload Data” pada Stage 1 — Scope & Filter untuk memastikan query V2 kembali normal.
- Cek bahwa toast 401 tidak muncul beruntun (throttle 5 detik).
- Pastikan fallback V1 berjalan bila endpoint V2 belum tersedia (hanya ditandai internal, tidak mengganggu UX).

## Rujukan Kode
- Interceptor V1: `src/services/api.js`
- Interceptor V2: `src/analytics_v2/services/api_v2.js`
- Reload & Controller: `src/analytics_v2/controllers/useAnalysisV2Controller.js`
- Stage 1 — Scope & Filter: `src/analytics_v2/components/Stage1ScopeFilterPanel.jsx`
- Stage 2 — Trend (empty state & efek visual): `src/analytics_v2/components/Stage2TrendPanel.jsx`

## Pedoman Implementasi ke Depan
- Jangan menghapus token dan auto logout untuk 401 non-auth; cukup tampilkan notifikasi.
- Hanya `/auth/me/` atau endpoint verifikasi identitas yang berhak memicu logout otomatis.
- Pertimbangkan penambahan mekanisme refresh token di masa depan agar sesi lebih tahan lama.
- Gunakan throttle untuk notifikasi berulang agar tidak mengganggu pengguna.

## Catatan Tambahan
- Perubahan ini tidak menyentuh V1 pipeline, tidak mengubah kontrak API, dan bersifat non-breaking untuk sistem eksisting.

