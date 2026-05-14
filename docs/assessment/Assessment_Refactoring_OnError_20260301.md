# Assessment: Frontend Refactoring (OnError Removal)

**Date**: 2026-03-01
**Topic**: Refactoring TanStack Query `onError` usage to `useEffect` pattern.

## 1. Assessment

**Domain**: Frontend Refactoring (React/TanStack Query)
**Dampak**: 
-   Meningkatkan stabilitas dan maintainability kode dengan menghilangkan metode usang (`onError` pada `useQuery`).
-   Menstandarisasi pola penanganan error (Toast Notification) di seluruh aplikasi.
**Risiko**: Rendah (Perubahan hanya pada logic error handling side-effect, tidak mengubah core logic pengambilan data).
**Hasil Audit**:
-   Semua instance `onError` pada `useQuery` di `Settings.jsx`, `HotspotAnalytics.jsx`, `RouterLogs.jsx`, `AuditLogs.jsx`, dan `Users.jsx` telah diganti dengan pola `useEffect` + `isError`.
-   Penggunaan `onError` pada `useMutation` (seperti di `HotspotMonitor.jsx`, `PPPoEMonitor.jsx`) tetap dipertahankan karena masih valid dan didukung oleh library.
**Rekomendasi Eksekusi**: Perubahan aman untuk dideploy. Lakukan sanity check pada fitur-fitur terkait untuk memastikan notifikasi error muncul dengan benar saat terjadi kegagalan request.

## 2. Log Chat Summary

**Ringkasan Perubahan:**
Refactoring menyeluruh pada kode frontend untuk mengganti penggunaan callback `onError` (yang sudah deprecated di TanStack Query v5) dengan `React.useEffect` untuk menangani notifikasi error.

**Detail File yang Dimodifikasi:**

1.  **`src/pages/Settings.jsx`**
    -   **Komponen**: `BotsManager` & `RecipientsManager`
    -   **Perubahan**: Menghapus `onError` dari `useQuery` untuk fetch bots & recipients. Menambahkan `useEffect` yang memantau state `isError` untuk memunculkan toast notifikasi.

2.  **`src/components/router/HotspotAnalytics.jsx`**
    -   **Komponen**: `HotspotAnalytics`
    -   **Perubahan**: Mengganti `onError` dengan `useEffect` + `isError` untuk menampilkan pesan "Failed to load hotspot analytics".

3.  **`src/components/router/RouterLogs.jsx`**
    -   **Komponen**: `RouterLogs`
    -   **Perubahan**: Mengganti `onError` dengan `useEffect` + `isError` untuk menampilkan pesan "Failed to load router logs".

4.  **`src/pages/AuditLogs.jsx`**
    -   **Komponen**: `AuditLogs`
    -   **Perubahan**: Mengganti `onError` dengan `useEffect` + `isError`. Log error ke console tetap dipertahankan bersama dengan toast notifikasi.

5.  **`src/pages/Users.jsx`**
    -   **Komponen**: `Users`
    -   **Perubahan**: Mengganti `onError` dengan `useEffect` + `isError` untuk menampilkan pesan "Gagal memuat data pengguna".

**Status Akhir:**
Semua komponen kini menggunakan pola standar yang konsisten untuk penanganan error pada data fetching. Kode lebih bersih dan siap untuk upgrade library di masa mendatang.
