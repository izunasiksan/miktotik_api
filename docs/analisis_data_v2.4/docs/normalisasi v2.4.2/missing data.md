1. Yang dilakukan kode saat ini

Bagian ini:

first_valid_idx = next(
    (i for i, x in enumerate(data)
     if x is not None and not (isinstance(x, float) and np.isnan(x))),
    None
)

last_valid_idx = next(
    (i for i in range(len(data)-1, -1, -1)
     if data[i] is not None and not (isinstance(data[i], float) and np.isnan(data[i]))),
    None
)

Hanya mencari:

index valid pertama

index valid terakhir

Kemudian membuat flag:

has_anchor_before = first_valid_idx is not None and first_valid_idx > 0
has_anchor_after = last_valid_idx is not None and last_valid_idx < len(data) - 1

Artinya hanya menjawab:

apakah ada missing di awal

apakah ada missing di akhir

apakah ada data valid sama sekali

2. Yang TIDAK dilakukan kode

Kode tidak pernah menghitung gap sequence seperti:

data:
[1, 2, None, None, 5, None, 7]

Seharusnya gapnya:

gap1 = index 2-3 (length 2)
gap2 = index 5 (length 1)

Tetapi kode sekarang tidak pernah membuat struktur gap seperti ini.

3. Kenapa gap tidak bisa di-agregasi

Karena tidak ada proses berikut:

scanning sequence

grouping missing values

menghitung panjang gap

menyimpan posisi gap

Jadi sistem hanya tahu:

missing_count
missing_percentage

Tetapi tidak tahu distribusi missing.

4. Dampak desain ini

Akibatnya strategi imputasi bisa salah.

Contoh:

missing_percentage = 10%

Kasus A

[1,None,3,None,5,None,7,None]

gap kecil → forward fill OK

Kasus B

[1,2,3,None,None,None,None,8]

gap besar → linear interpolation lebih baik

Tetapi kode kamu tidak bisa membedakan dua kondisi ini.

5. Cara memperbaiki: Gap Aggregation

Tambahkan algoritma untuk mendeteksi gap segments.

Contoh implementasi:

def _detect_gap_segments(self, data):
    gaps = []
    current_gap = []

    for i, v in enumerate(data):
        if v is None or (isinstance(v, float) and np.isnan(v)):
            current_gap.append(i)
        else:
            if current_gap:
                gaps.append(current_gap)
                current_gap = []

    if current_gap:
        gaps.append(current_gap)

    return gaps
6. Statistik gap yang bisa dihitung

Dari gap segments:

gaps = [[2,3],[5]]

Bisa dihitung:

gap_count = 2
max_gap_length = 2
avg_gap_length = 1.5

Contoh output:

"gap_analysis": {
  "gap_count": 2,
  "max_gap_length": 2,
  "avg_gap_length": 1.5,
  "gap_segments": [[2,3],[5]],
  "has_anchor_before": true,
  "has_anchor_after": true,
  "imputation_possible": true
}
7. Kenapa ini penting untuk timeseries

Gap size menentukan metode imputasi:

Gap Size	Strategy
1	forward fill
2-3	linear interpolation
4-10	regression
>10	multiple imputation

Tanpa gap aggregation, strategi jadi kurang adaptif.

8. Kesimpulan

Gap tidak di-agregasi karena:

detect_missing_data() hanya melakukan anchor detection

tidak ada loop untuk mengelompokkan missing

tidak ada gap segmentation algorithm

output hanya metadata sederhana