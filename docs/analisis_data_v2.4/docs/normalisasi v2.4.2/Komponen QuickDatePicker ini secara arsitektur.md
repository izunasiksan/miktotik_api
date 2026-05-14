Komponen QuickDatePicker ini secara arsitektur sudah cukup rapi. Ia cocok sebagai molecule dalam Atomic Design dan sudah memanfaatkan Zustand store dengan benar. Tapi dari sisi engineering dan reliability, masih ada beberapa potensi bug dan edge case penting yang sebaiknya kamu perbaiki.

Aku akan fokus pada hal yang benar-benar berdampak pada data analysis pipeline kamu, bukan hanya style.

1. Bug utama: parsing Date() dari string tanpa timezone

Di beberapa tempat kamu melakukan:

const d = new Date(currentDateStr);

dan

const d = new Date(val);

Padahal format yang kamu kirim dari component adalah:

YYYY-MM-DDTHH:mm:ss

Contoh:

2026-01-01T00:00:00

Masalahnya:

Browser akan menafsirkannya sebagai local time atau UTC tergantung engine.

Contoh:

2026-01-01T00:00:00

bisa menjadi

2025-12-31T17:00:00Z

di browser tertentu.

Akibatnya:

displayValue
year/month/day

bisa shift 1 hari.

Solusi lebih aman

Tambahkan timezone Z saat membuat ISO.

Ganti:

const isoString = `${tempDate.year}-${tempDate.month}-${tempDate.day}T${timeStr}`;

menjadi:

const isoString = `${tempDate.year}-${tempDate.month}-${tempDate.day}T${timeStr}Z`;

atau gunakan format backend yang konsisten.

2. Bug UX: picker tidak menutup saat klik di luar

Saat ini dropdown hanya ditutup jika:

Apply
Batal
togglePicker

Jika user klik di luar:

dropdown tetap terbuka

Ini UX bug yang cukup terasa.

Solusi

Tambahkan outside click handler

Contoh:

useEffect(() => {
  const handler = (e) => {
    if (!ref.current?.contains(e.target)) {
      setShowPicker(false);
    }
  };

  document.addEventListener("mousedown", handler);

  return () => {
    document.removeEventListener("mousedown", handler);
  };
}, []);
3. Bug kecil: computeDaysInMonth tidak dipakai konsisten

Kamu punya helper:

computeDaysInMonth

tapi di useMemo kamu menulis ulang logic:

const d = new Date(parseInt(tempDate.year), parseInt(tempDate.month), 0);

Ini membuat logic duplicate.

Lebih clean

Gunakan helper:

const count = computeDaysInMonth(tempDate.year, tempDate.month);
4. Edge case: Reset tidak reset dropdown

Di sini:

const handleReset = () => {
  setTempDate({ year: '', month: '', day: '' });
  setTimeRange({ [type]: null });
};

Tapi picker tetap terbuka.

UX yang lebih konsisten:

reset → dropdown close

Tambahkan:

setShowPicker(false);
5. Bug kecil: displayValue dependency terlalu luas

Ini:

}, [timeRange, type]);

Setiap perubahan timeRange.start atau timeRange.end akan rerender.

Padahal kamu hanya butuh:

timeRange.start
atau
timeRange.end
Lebih efisien
const val = type === 'start' ? timeRange.start : timeRange.end;

useMemo(...,[val])
6. Potensi bug store update

Di sini:

setTimeRange({ [type]: isoString });

Ini berarti store harus merge state.

Kalau implementasi Zustand kamu tidak merge otomatis, bisa terjadi:

start dihapus saat end diset

Pastikan store kamu seperti ini:

setTimeRange: (range) =>
  set((state) => ({
    timeRange: { ...state.timeRange, ...range }
  }))
7. Edge case: tahun depan bisa dipilih

Kamu generate tahun:

currentYear + 1

Artinya user bisa memilih:

2027

Padahal data router belum ada.

Lebih realistis:

max = currentYear

atau

max = latestDataYear

yang sebenarnya lebih bagus untuk pipeline kamu.

8. UI logic yang sebenarnya sangat bagus

Beberapa bagian kode kamu menunjukkan desain yang matang:

Quality badge
accuracyPct

ini bagus karena:

user tahu kualitas data sebelum analisis

ini jarang ada di UI analitik.

Cascading dropdown
Year → Month → Day

ini menghindari:

31 Februari

Good UX decision.

Context Lock integration
isLocked

semua input disabled.

Ini konsisten dengan pipeline architecture yang kamu buat.