# Frontend Refactor: Migration to TanStack Query

**Tanggal:** 2026-03-01
**Status:** Completed
**Author:** AI Assistant

## Ringkasan Perubahan
Melakukan refactoring pada komponen-komponen utama Frontend untuk menggantikan pola data fetching lama (`useEffect` + `useState`) dengan library modern **TanStack Query** (`useQuery`, `useMutation`).

## Komponen yang Dimodifikasi

### 1. Router Management
- **`InterfaceList.jsx`**
  - Migrasi `getInterfaces` ke `useQuery`.
  - Migrasi toggle status interface ke `useMutation` dengan invalidasi query otomatis.
  - Penambahan loading state dan error handling terstandarisasi.

- **`RouterLogs.jsx`**
  - Migrasi `getBoardEvents` ke `useQuery`.
  - Implementasi fitur `refetch` manual.

- **`BackupManager.jsx`**
  - Migrasi `getBackups` ke `useQuery`.
  - Migrasi `createBackup` dan `restoreBackup` ke `useMutation`.
  - Otomatis refresh list setelah backup dibuat.

- **`VPNManager.jsx`**
  - Migrasi `getVPNProfiles` ke `useQuery`.
  - Migrasi Create/Delete profile ke `useMutation`.

### 2. Monitoring & Analytics
- **`PPPoEMonitor.jsx`**
  - Migrasi `getPPPoEUsers` ke `useQuery` dengan `refetchInterval` 15 detik (menggantikan `setInterval` manual yang berpotensi memory leak).
  - Migrasi `kickPPPoEUser` ke `useMutation`.

- **`HotspotAnalytics.jsx`**
  - Migrasi `getHotspotReports` ke `useQuery`.
  - Transformasi data untuk visualisasi grafik.

- **`ZTPQueue.jsx`**
  - Migrasi `getZTPQueue` ke `useQuery` dengan polling interval 15 detik.
  - Migrasi Approve/Reject device ke `useMutation`.

## Manfaat Teknis
1.  **Eliminasi Boilerplate:** Pengurangan kode repetitif (`useState` untuk data/loading/error, `useEffect`, `try-catch`).
2.  **Automatic Caching & Background Refetch:** Data tetap segar tanpa perlu reload manual yang berlebihan.
3.  **Race Condition Handling:** TanStack Query menangani request yang tumpang tindih secara otomatis.
4.  **Memory Leak Prevention:** Pembersihan otomatis interval polling saat komponen unmount.
5.  **Konsistensi UX:** Loading spinner dan Toast notification seragam di seluruh modul.

## Kepatuhan Rules
- **Layer 2 (Frontend Stack):** Menggunakan React Functional Components, Tailwind CSS, Axios, dan TanStack Query.
- **Layer 3 (Anti-Hallucination):** Logic-First diterapkan (analisis sebelum koding), Atomic Execution (per komponen), Verification Loop (self-audit).
- **HCI Standards:** Loading indicator dan Toast notification diimplementasikan pada setiap interaksi asinkron.
