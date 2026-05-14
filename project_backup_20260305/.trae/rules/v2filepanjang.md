---
alwaysApply: false
---
[ JIKA FILE FRONTEND PANJANG WAJIB :
1. Pecah component besar menjadi beberapa sub-component kecil.
2. Pisahkan folder per halaman.
3. Pindahkan logic ringan (fetch, filter, state) ke custom hook.
4. Hindari nested ternary panjang, gunakan function render terpisah.
5. Gunakan mapping (array.map) untuk elemen berulang.
6. Pisahkan container (logic) dan presentational component (UI).
7. Ekstrak bagian besar menjadi helper component/function kecil.
8. Hindari terlalu banyak state dalam satu component.
9. Gunakan reusable component untuk tombol, card, table, modal.]

[ Dilarang merubah database dan schema.sql
jika ada perubahan database buat /docs lalu hentikan proses. ]