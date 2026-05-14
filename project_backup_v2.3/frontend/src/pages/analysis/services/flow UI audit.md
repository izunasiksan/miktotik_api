MENAMPILKAN SELURUH ATRIBUT BERDASARKAN TABEL

Tujuan:
Menampilkan seluruh struktur data mentah (raw) sebelum dilakukan pemilihan nilai atau konversi satuan.

A. Tabel speed

upload
satuan: Mbps / Gbps
default: Mbps

download
satuan: Mbps / Gbps
default: Mbps

B. Tabel health

cpu
satuan: Percent (%)
default: %

memory
satuan: Bytes / KB / MB / GB

hdd
satuan: Bytes / KB / MB / GB

C. Tabel total_usage_interface

interface_name
tipe: identity / label (string)

usage
satuan: Bytes / KB / MB / GB

Output tahap 1:

Sistem hanya menampilkan seluruh atribut

Tidak ada konversi satuan

Tidak ada penguncian

Masih raw structural view

MENENTUKAN NILAI DAN SATUAN ATRIBUT

Tujuan:
User memilih atribut aktif dan menentukan satuan yang akan digunakan.

Proses:

Memilih atribut yang akan diproses

Menentukan satuan nilai

Sistem melakukan konversi jika diperlukan

Contoh:
Jika upload dipilih dalam Gbps
Maka sistem mengkonversi nilai dari Mbps ke Gbps

Status:

Masih bisa diubah

Belum dikunci

SIMPAN DAN KUNCI SEMENTARA VALUE

Tujuan:
Mengunci konfigurasi agar tidak berubah saat proses analisis dimulai.

Proses:

Simpan konfigurasi atribut dan satuan

Tandai sebagai locked_config = true

Aturan:

Tidak boleh mengubah satuan

Tidak boleh mengubah atribut

Hanya bisa melakukan reset total

Tahap ini berfungsi sebagai snapshot sebelum analisis.

PEMILIHAN BERDASARKAN DIMENSI WAKTU

Tujuan:
Menentukan dimensi waktu untuk analisis data.

Pilihan dimensi:

Per jam

Per hari

Per minggu

Per bulan

Proses:

Melakukan agregasi data

Mengelompokkan berdasarkan waktu yang dipilih

Data berubah dari raw menjadi analytical mode

Alur keseluruhan:
RAW DATA
↓

Attribute Exposure
↓

Unit and Value Normalization
↓

Temporary Lock
↓

Time Dimension Filtering
↓
ANALYSIS READY DATA