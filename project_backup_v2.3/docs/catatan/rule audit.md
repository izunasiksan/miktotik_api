🛡️ Prosedur Pelaksanaan Audit Lintas Fase (1-4)
Proses audit ini dilakukan untuk memastikan bahwa setiap baris kode dan fungsi sistem telah selaras dengan standar operasional. Berikut adalah urutan langkahnya:

Langkah 1: Persiapan dan Verifikasi Lingkungan (Pra-Audit)
Sinkronisasi Aturan: Membaca kembali dokumen AI_RULES.md sebagai kompas utama pemeriksaan.

Pemeriksaan Variabel Lingkungan: Memastikan berkas .env sudah lengkap namun tetap aman (tidak ada kredensial yang bocor ke repositori).

Pengecekan Dependensi: Menjalankan perintah instalasi pustaka untuk memastikan semua tools pendukung (SQLAlchemy, FastAPI, Alembic, React) berada pada versi yang benar.

Langkah 2: Audit Integritas Data dan Keamanan (Fase 1)
Validasi Skema Database: Menjalankan perintah migrasi dan memeriksa apakah struktur tabel di database sudah sesuai dengan model yang dirancang.

Uji Penetrasi Dasar: Mencoba memasukkan data pengguna secara manual untuk memverifikasi apakah sistem enkripsi Argon2 secara otomatis menyandikan kata sandi.

Langkah 3: Audit Operasional Worker dan Stabilitas (Fase 2)
Observasi Perilaku Worker: Menjalankan worker secara manual dan memantau log sistem.

Simulasi Kegagalan Jaringan: Memutus koneksi ke salah satu router simulasi untuk memastikan fungsi timeout (10 detik) bekerja dan tidak menghentikan proses batch perangkat lainnya.

Verifikasi Efisiensi: Memastikan penggunaan memori server tetap stabil saat worker melakukan penarikan data dalam jumlah besar.

Langkah 4: Audit Mekanisme Peringatan (Fase 3)
Uji Trigger Notifikasi: Memicu status "Offline" pada perangkat secara sengaja dan menghitung waktu hingga notifikasi muncul di Telegram.

Validasi Anti-Flapping: Berulang kali mengubah status perangkat (Up/Down) dalam waktu singkat untuk memastikan sistem tidak mengirimkan "spam" notifikasi (menghormati grace period 60 detik).

Langkah 5: Audit Antarmuka dan Integrasi End-to-End (Fase 4)
Uji Komunikasi API: Menggunakan tools seperti Postman atau Swagger untuk memastikan setiap endpoint API memberikan respon data yang benar dalam format JSON.

Verifikasi Visual: Membuka Dasbor React dan memastikan data yang ditarik oleh worker di Fase 2 tampil secara akurat di layar pengguna.

Pengecekan Keamanan CORS: Mencoba mengakses API dari domain yang tidak dikenal untuk memastikan akses ditolak oleh sistem.

Langkah 6: Penyusunan Laporan dan Sesi Penutup
Pencatatan Temuan: Mendokumentasikan setiap ketidaksesuaian (mayor/minor).

Penetapan Tindakan Korektif (CAR): Menuliskan instruksi perbaikan untuk poin-poin yang belum sempurna (seperti sistem login yang belum ada).

Finalisasi: Meminta konfirmasi tertulis dari tim pengembang bahwa hasil audit telah diterima dan siap ditindaklanjuti.