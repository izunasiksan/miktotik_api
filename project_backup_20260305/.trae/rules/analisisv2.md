---
alwaysApply: false
---
ANALYTICS_PIPELINE_V2_RULE
referensi /docs/analisis data v2
TUJUAN
Menerapkan pipeline analitik V2 (versi 2/baru) tanpa mengubah sistem V1 (versi 1/lama).

PRINSIP
1. V1 bersifat locked dan tidak boleh dimodifikasi.
2. Tidak boleh edit file, struktur, API, atau kontrak data V1.
3. Tidak boleh mengubah perilaku atau output V1.
4. V2 harus terisolasi penuh dan independen.

IMPLEMENTASI
1. Buat direktori/module baru khusus V2.
2. Gunakan hook, util, controller, dan service versi V2.
3. Jangan override endpoint V1.
4. Jika perlu API baru, buat endpoint terpisah untuk V2.

PIPELINE V2 WAJIB
0 Normalisasi
1 Scope & Filter
2 Trend
3 Korelasi
4 Kebiasaan
5 Validasi Anomali
6 Prediksi Kapasitas
7 Insight

INTEGRASI
Gunakan route atau feature flag terpisah. V1 tetap berjalan tanpa perubahan.

FINAL
V2 harus non-breaking, backward-safe, dan tidak memengaruhi V1.
END.
chat wajib untuk menyarankan langkah selanjutnya
jika ada kekurangan buat dokumentasi V2 /docs