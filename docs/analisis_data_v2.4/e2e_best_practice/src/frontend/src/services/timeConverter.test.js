import { describe, test, expect } from 'vitest';
import { convertTimeScale, TIME_UNITS } from './timeConverter';

describe('Time Scale Conversion Unit Test', () => {
  // Skenario 1: Hari ke Bulan (30 Hari) - 100%
  test('Konversi Hari ke Bulan (30 Hari)', () => {
    const data = new Array(30).fill(100);
    const result = convertTimeScale(data, TIME_UNITS.DAY, TIME_UNITS.MONTH);
    expect(result.value).toBe(100);
    expect(result.accuracy).toBe('100% akurat');
    expect(result.isWarning).toBe(false);
  });

  // Skenario 2: Hari ke Bulan (7 Hari) - 23%
  test('Konversi Hari ke Bulan (7 Hari)', () => {
    const data = new Array(7).fill(100);
    const result = convertTimeScale(data, TIME_UNITS.DAY, TIME_UNITS.MONTH);
    expect(result.value).toBe(100);
    expect(result.accuracy).toBe('23% akurat');
    expect(result.isWarning).toBe(true);
    expect(result.message).toBe('telah dikonversi hanya 23% akurat');
  });

  // Skenario 3: Jam ke Hari (24 Jam) - 100%
  test('Konversi Jam ke Hari (24 Jam)', () => {
    const data = new Array(24).fill(100);
    const result = convertTimeScale(data, TIME_UNITS.HOUR, TIME_UNITS.DAY);
    expect(result.value).toBe(100);
    expect(result.accuracy).toBe('100% akurat');
    expect(result.isWarning).toBe(false);
  });

  // Skenario 4: Jam ke Hari (7 Jam) - 29%
  test('Konversi Jam ke Hari (7 Jam)', () => {
    const data = new Array(7).fill(100);
    const result = convertTimeScale(data, TIME_UNITS.HOUR, TIME_UNITS.DAY);
    expect(result.value).toBe(100);
    expect(result.accuracy).toBe('29% akurat');
    expect(result.isWarning).toBe(true);
    expect(result.message).toBe('telah dikonversi hanya 29% akurat');
  });

  // Skenario 5: Menit ke Jam (60 Menit) - 100%
  test('Konversi Menit ke Jam (60 Menit)', () => {
    const data = new Array(60).fill(100);
    const result = convertTimeScale(data, TIME_UNITS.MINUTE, TIME_UNITS.HOUR);
    expect(result.value).toBe(100);
    expect(result.accuracy).toBe('100% akurat');
    expect(result.isWarning).toBe(false);
  });

  // Skenario 6: Menit ke Jam (45 Menit) - 75%
  test('Konversi Menit ke Jam (45 Menit)', () => {
    const data = new Array(45).fill(100);
    const result = convertTimeScale(data, TIME_UNITS.MINUTE, TIME_UNITS.HOUR);
    expect(result.value).toBe(100);
    expect(result.accuracy).toBe('75% akurat');
    expect(result.isWarning).toBe(true);
  });

  // Skenario 7: Detik ke Menit (60 Detik) - 100%
  test('Konversi Detik ke Menit (60 Detik)', () => {
    const data = new Array(60).fill(100);
    const result = convertTimeScale(data, TIME_UNITS.SECOND, TIME_UNITS.MINUTE);
    expect(result.value).toBe(100);
    expect(result.accuracy).toBe('100% akurat');
    expect(result.isWarning).toBe(false);
  });

  // Skenario 8: Detik ke Menit (15 Detik) - 25%
  test('Konversi Detik ke Menit (15 Detik)', () => {
    const data = new Array(15).fill(100);
    const result = convertTimeScale(data, TIME_UNITS.SECOND, TIME_UNITS.MINUTE);
    expect(result.value).toBe(100);
    expect(result.accuracy).toBe('25% akurat');
    expect(result.isWarning).toBe(true);
  });

  // Skenario 9: Validasi Input (Satuan Tidak Valid)
  test('Validasi Input (Satuan Tidak Valid)', () => {
    expect(() => {
      convertTimeScale([1, 2, 3], 'invalid', 'day');
    }).toThrow('Satuan tidak valid');
  });

  // Skenario 10: Data Kosong
  test('Data Kosong', () => {
    const result = convertTimeScale([], TIME_UNITS.DAY, TIME_UNITS.MONTH);
    expect(result.value).toBe(0);
    expect(result.accuracy).toBe('0% akurat');
    expect(result.isWarning).toBe(true);
  });
});
