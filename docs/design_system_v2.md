# Design System V2 — Stage 1 (Scope & Filter)

## Prinsip Umum

- WCAG 2.1 AA: kontras minimal 4.5:1 (teks normal) dan 3:1 (teks besar).
- Dukungan buta warna: mode CB-friendly menambahkan pola garis (hatch) pada intensitas tinggi.
- ISO 7000: ikon bersifat universal dan selalu disertai label teks.
- Heuristik Nielsen: visibilitas status, pencegahan error, dan dukungan Undo/Redo.
- Responsif: desktop ≥1024px, tablet ≥768px, mobile ≥320px.

## Sistem Warna

- Default (aman untuk kontras): teks utama `text-gray-900` di atas `bg-white`, label `text-gray-800/700`, bantuan `text-gray-600`.
- Skala intensitas timeline:
  - Default: `bg-blue-100/300/400/500/700` (gradien biru).
  - High-contrast: `bg-indigo-200/400/600/800/black`.
  - CB-friendly: tambahkan pola garis diagonal pada intensitas ≥60%.

## Aksesibilitas

- ARIA:
  - Timeline: `role="listbox"` dan setiap slot `role="option"` dengan `aria-selected`.
  - Pesan status: `aria-live="polite"` untuk feedback validasi dan detail slot.
- Navigasi keyboard:
  - Tabs: Enter/Space untuk aktivasi.
  - Dropdown saran: Enter untuk memilih, dapat ditambah Arrow Up/Down.
- Label ikon selalu diikuti teks yang deskriptif.

## Komponen

- Tabs (Aksesibel):
  - Role `tablist`, `tab`, `tabpanel`.
  - Fokus jelas dan transisi halus.

- Stage1Timeline:
  - Props: `highContrast`, `cbFriendly`.
  - Pattern stripes untuk CB-friendly pada intensitas tinggi.
  - Fokus ring kontras, `aria-live` untuk detail.

- Entity Autocomplete:
  - Debounce 250ms, daftar saran di bawah input.
  - Pilihan saran via klik atau Enter.
  - Mencegah duplikasi nama entitas.

- Undo/Redo (Apply Panel):
  - Menyimpan snapshot state saat Apply.
  - Undo/Redo memulihkan snapshot dengan aman.

## Pola Interaksi

- Validasi & Apply:
  - Saat sukses, indikator “Validated” tampil.
  - Error ditunjukkan dengan teks kontras merah.

- Auto-refresh:
  - Interval dapat diubah (15s/30s/60s), hanya aktif saat Time Lock.

- Quick Entity:
  - Shortcut konfigurasi umum (speed, usage, clients, pppoe, hotspot, cpu).

## Pengujian Kegunaan

- Usability testing (≥5 partisipan):
  - Metrik: task completion ≥80%, waktu penyelesaian, error rate.
  - Skenario: memilih board, memilih entitas, memilih rentang waktu via timeline, Validate & Apply, Undo perubahan.
  - Observasi: kejelasan label, keterbacaan, kemudahan navigasi, keberhasilan memilih entitas dari saran.

## Catatan Implementasi

- Semua agregasi berat dilakukan di backend (sesuai aturan).
- Seluruh perubahan berada di jalur V2 dan tidak mempengaruhi V1.

