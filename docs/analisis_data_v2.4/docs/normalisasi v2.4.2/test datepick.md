1. Test terlalu bergantung pada DOM structure (rapuh)

Di sini:

const pickerTrigger = screen.getByText('Pilih Tanggal').parentElement.parentElement;

Masalahnya:

Test kamu bergantung pada struktur HTML.

Jika nanti markup berubah sedikit:

<div>
  <span>Pilih Tanggal</span>
</div>

atau

<button>Pilih Tanggal</button>

test akan langsung gagal walaupun fitur masih benar.

Cara yang lebih robust

Gunakan role atau label.

Misalnya di komponen:

<button aria-label="open-date-picker">

lalu di test:

fireEvent.click(screen.getByLabelText('open-date-picker'));

atau:

screen.getByRole('button', { name: /pilih tanggal/i })
2. Penggunaan toBeDefined() kurang tepat

Ini:

expect(screen.getByText('Mulai')).toBeDefined();

getByText() sudah throw error jika tidak ada.

Jadi assertion ini sebenarnya tidak memberi nilai tambahan.

Lebih idiomatik:

expect(screen.getByText('Mulai')).toBeInTheDocument();

Ini berasal dari:

@testing-library/jest-dom

lebih jelas maksudnya.

3. Leap year test bagus, tapi kurang lengkap

Test kamu:

expect(dayOptions.length).toBe(30);

Ini benar untuk:

29 hari + placeholder

Tapi akan lebih kuat jika juga test non leap year.

Contoh:

2023 Februari → 28 hari

Test tambahan:

fireEvent.change(selects[0], { target: { value: '2023' } });
fireEvent.change(selects[1], { target: { value: '02' } });

const dayOptions = selects[2].querySelectorAll('option');
expect(dayOptions.length).toBe(29);
4. Test Apply terlalu spesifik pada format

Ini:

expect(mockSetTimeRange).toHaveBeenCalledWith({
  start: '2024-05-15T00:00:00'
});

Masalahnya:

Kalau nanti kamu memperbaiki bug timezone menjadi:

2024-05-15T00:00:00Z

test ini akan gagal, padahal sistem sebenarnya lebih benar.

Lebih fleksibel:

expect(mockSetTimeRange).toHaveBeenCalledWith({
  start: expect.stringContaining('2024-05-15')
});

atau:

const arg = mockSetTimeRange.mock.calls[0][0];
expect(arg.start).toMatch(/^2024-05-15/);
5. Missing test penting: picker close setelah apply

Saat ini kamu hanya test:

Apply → setTimeRange

tapi tidak test:

Apply → picker close

Padahal UX penting.

Test yang ideal:

fireEvent.click(applyBtn);

expect(screen.queryByText('Tahun')).toBeNull();
6. Missing test: cascading full flow

Sekarang kamu test:

Year → enable Month

Tapi belum test:

Month → enable Day

Tambahkan:

expect(selects[2].disabled).toBe(true);

fireEvent.change(selects[1], { target: { value: '05' } });

expect(selects[2].disabled).toBe(false);
7. Mock Zustand bagus, tapi bisa lebih aman

Sekarang kamu:

useContextLockStore.mockReturnValue(...)

Ini akan sama untuk semua call.

Jika komponen memanggil hook beberapa kali, bisa tricky.

Pattern yang lebih aman:

useContextLockStore.mockImplementation(() => ({
  timeRange: { start: null, end: null },
  setTimeRange: mockSetTimeRange,
  isLocked: false
}));
8. Missing test: display value

Komponen kamu punya logic:

displayValue

Test penting:

Jika timeRange.start sudah ada → tampilkan tanggal

Contoh:

useContextLockStore.mockReturnValue({
  timeRange: { start: '2024-05-15T00:00:00', end: null },
  setTimeRange: mockSetTimeRange,
  isLocked: false
});

lalu:

expect(screen.getByText(/2024/)).toBeInTheDocument();
9. Test locked state sudah bagus

Bagian ini sangat benar:

expect(screen.queryByText('Tahun')).toBeNull();

Ini memastikan:

UI tidak membuka picker saat locked

Ini penting karena sistem kamu memakai Context Lock Pattern.