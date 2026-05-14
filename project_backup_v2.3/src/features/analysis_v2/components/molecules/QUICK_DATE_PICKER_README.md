l# QuickDatePicker Component Documentation

## Overview
`QuickDatePicker` adalah komponen pemilihan tanggal interaktif yang dirancang khusus untuk modul Analisis Data V2. Komponen ini mengimplementasikan *cascading dropdown selection* (Year -> Month -> Day) dengan validasi otomatis untuk mencegah kesalahan input tanggal (seperti 31 Februari).

## Lokasi File
- Komponen: `src/features/analysis_v2/components/molecules/QuickDatePicker.jsx`

## Fitur Utama
1. **Cascading Dropdown**: Pilihan bulan bergantung pada tahun, dan pilihan hari bergantung pada kombinasi bulan/tahun terpilih.
2. **Validasi Otomatis**: Secara cerdas mengoreksi tanggal jika pengguna mengganti bulan yang memiliki jumlah hari lebih sedikit dari tanggal yang sudah dipilih sebelumnya.
3. **Zustand Integration**: Terhubung langsung ke `useContextLockStore` untuk sinkronisasi state `timeRange`.
4. **Context Lock Support**: Komponen otomatis menjadi *read-only* jika status `isLocked` pada store bernilai `true`.
5. **UI/UX Modern**: Menggunakan Tailwind CSS untuk styling dan Lucide Icons untuk indikator visual.

## Penggunaan (Usage)
```jsx
import QuickDatePicker from './QuickDatePicker';

const MyComponent = () => {
  return (
    <div className="grid grid-cols-1 gap-4">
      <QuickDatePicker label="Mulai" type="start" />
      <QuickDatePicker label="Selesai" type="end" />
    </div>
  );
};
```

## Props
| Prop | Tipe | Deskripsi |
|------|------|-----------|
| `label` | `string` | Label yang ditampilkan di atas input (contoh: "Mulai"). |
| `type` | `'start' \| 'end'` | Menentukan apakah komponen ini mengontrol `timeRange.start` atau `timeRange.end`. |

## Integrasi Preset
Komponen ini bekerja secara sinergis dengan fungsi `setPresetRange` di `ScopeFilterStage.jsx`. Ketika preset dipilih (misal: "Last 7 Days"), `QuickDatePicker` akan secara otomatis memperbarui tampilan internalnya untuk mencerminkan tanggal yang baru.

## Validasi Tanggal
- **Februari**: Mendukung pengecekan tahun kabisat (Leap Year) secara otomatis.
- **Bulan 30 Hari**: Membatasi pilihan tanggal hingga 30 untuk April, Juni, September, dan November.
- **Apply Mechanism**: Data hanya akan dikirim ke store global setelah pengguna menekan tombol "Apply", mencegah re-render berlebihan saat pengguna masih dalam proses memilih.
