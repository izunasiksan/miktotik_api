---
alwaysApply: false
---

[ FRONTEND DILARANG melakukan perhitungan agregasi berat (seperti SUM besar, GROUP BY kompleks, ranking, statistik, atau multi-table join).
SEMUA agregasi wajib dilakukan di BACKEND, melalui: Query SQL (GROUP BY, COUNT, SUM, AVG, JOIN, dsb), atau Proses server-side setelah data diambil dari database.
Frontend hanya menerima hasil akhir agregasi.
Filtering ringan (misalnya pencarian lokal, sort kecil, filter tampilan UI) boleh dilakukan di rontend atau backend, pilih yang paling efisien dan tidak membebani browser.
Agregasi berat dilakukan di level database (SQL).
Backend hanya mengemas dan mengirim hasilnya ke frontend. ]