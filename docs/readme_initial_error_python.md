Standarisasi & Hierarki Error Python
1. Tahap Kemunculan Error
Error dalam Python muncul pada dua fase utama sesuai standar eksekusi CPython:

🔴 Fase Parsing (Compile-time)

Terjadi sebelum kode dijalankan. Jika ada error di sini, program tidak akan berjalan sama sekali.

• SyntaxError: Pelanggaran aturan penulisan kode.

• IndentationError: Kesalahan spasi/tab yang merusak struktur blok.

🟡 Fase Eksekusi (Runtime)

Terjadi saat program sedang berjalan dan menabrak logika yang mustahil.

• NameError: Memanggil variabel yang belum dibuat.

• TypeError: Operasi pada tipe data yang tidak sesuai.

• ZeroDivisionError: Pembagian dengan angka nol.

---

2. Struktur Standar Traceback
Setiap kali error muncul, Python menampilkan informasi dengan urutan:

1. File Path: Lokasi file yang bermasalah.

2. Line Number: Baris spesifik tempat error terdeteksi.

3. Module/Function: Nama fungsi tempat error terjadi.

4. Caret (`^`): Menunjuk posisi karakter penyebab error.

5. Error Name & Message: Nama resmi error dan penjelasan detail.

---

3. Hierarki Objek Exception
Semua error di Python adalah objek yang mewarisi kelas utama:

• BaseException (Akar utama)

  • `SystemExit`: Keluar program secara normal.

  • `KeyboardInterrupt`: User menekan `Ctrl+C`.

  • Exception: Kategori umum untuk semua error logika/kode.

    • `ArithmeticError`: (ZeroDivisionError, etc)

    • `LookupError`: (IndexError, KeyError)

    • `RuntimeError`

---

4. Standar Penanganan (Best Practice)
Gunakan blok `try...except` untuk menjaga agar aplikasi tidak langsung mati:

```

try:

    # Kode berisiko

    nilai = int(input("Masukkan angka: "))

except ValueError:

    # Penanganan jika input bukan angka

    print("Error: Harap masukkan angka yang valid!")

finally:

    # Selalu dijalankan

    print("Proses pengecekan selesai.")

```
======================================================
Panduan Syntax Error Python Berdasarkan Level Risiko
🔴 RISK: HIGH (Fatal / Stopping Error)
Error ini menyebabkan program sama sekali tidak bisa berjalan (gagal pada tahap parsing).

• SyntaxError: invalid syntax

  • Penyebab: Kesalahan struktur dasar seperti `if x = 5` (seharusnya `==`) atau penulisan keyword yang salah.

• IndentationError / TabError

  • Penyebab: Struktur blok kode yang rusak. Sangat kritis di Python karena indentasi menentukan logika program.

• SyntaxError: unexpected EOF while parsing

  • Penyebab: Ada kurung `(`, `[` atau kutipan `"` yang tidak ditutup. Python mencari akhir file tapi tidak menemukan pasangannya.

🟡 RISK: MEDIUM (Logic Trigger / Runtime Failure)
Bukan "compile error" murni, tapi sering terjadi karena salah penulisan yang baru terdeteksi saat eksekusi.

• NameError: name 'x' is not defined

  • Penyebab: Memanggil variabel/fungsi yang belum dibuat atau salah ketik (typo).

• TypeError: missing required positional argument

  • Penyebab: Memanggil fungsi tanpa memberikan parameter yang diwajibkan.

• AttributeError

  • Penyebab: Mencoba mengakses fitur/method yang tidak ada pada sebuah objek.

🟢 RISK: LOW (Warning / Optimization)
Tidak menghentikan program secara langsung, tapi menandakan ada yang tidak beres dengan cara penulisan.

• SyntaxWarning

  • Penyebab: Menggunakan `is` untuk perbandingan literal (misal: `if x is 5`), yang seharusnya menggunakan `==`.

• DeprecationWarning

  • Penyebab: Menggunakan sintaks atau library lama yang akan dihapus di versi Python mendatang.


==========================================================

Berikut adalah pembagian level error Python berdasarkan Dampak Operasional:

1. Level: Blocker (Stop Total)
Error ini terjadi di tahap parsing. Program sama sekali tidak bisa di-load ke memori.

Jenis Error: SyntaxError, IndentationError.

Dampaknya: * Aplikasi tidak bisa startup.

Jika ini terjadi di server production, layanan akan langsung mati (crash on boot).

Paling mudah diperbaiki karena Python langsung menunjuk baris yang salah.

2. Level: Critical (Runtime Crash)
Program berhasil jalan, tapi tiba-tiba mati di tengah jalan saat sampai ke baris kode tertentu.

Jenis Error: NameError (variabel undefined), ZeroDivisionError, FileNotFoundError.

Dampaknya:

Menyebabkan interupsi pada pengguna (misal: aplikasi tiba-tiba tertutup).

Potensi kehilangan data jika error terjadi saat proses penyimpanan.

Seringkali disebabkan oleh input user yang tidak terduga atau salah ketik nama variabel.

3. Level: Logic Leak (Silent Failure)
Ini adalah level yang paling berbahaya karena tidak ada pesan error. Program jalan terus, tapi hasilnya salah.

Jenis: Kesalahan logika (misal: menggunakan + padahal seharusnya *).

Dampaknya:

Sangat sulit dideteksi (hard to debug).

Bisa menyebabkan kerugian finansial atau salah data tanpa disadari dalam waktu lama.

Membutuhkan Unit Testing untuk pencegahan.