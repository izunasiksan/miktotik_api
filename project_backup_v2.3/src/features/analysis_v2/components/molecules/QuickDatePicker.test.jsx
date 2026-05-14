import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import QuickDatePicker from './QuickDatePicker';
import { useContextLockStore } from '../../../../store/analysisStore';

// Mock Zustand Store
vi.mock('../../../../store/analysisStore', () => ({
  useContextLockStore: vi.fn()
}));

describe('QuickDatePicker Molecule Component', () => {
  let mockSetTimeRange;
  
  beforeEach(() => {
    cleanup();
    mockSetTimeRange = vi.fn();
    useContextLockStore.mockReturnValue({
      timeRange: { start: null, end: null },
      setTimeRange: mockSetTimeRange,
      isLocked: false
    });
  });

  test('Render komponen dengan label yang benar', () => {
    render(<QuickDatePicker label="Mulai" type="start" />);
    expect(screen.getByText('Mulai')).toBeDefined();
    expect(screen.getByText('Pilih Tanggal')).toBeDefined();
  });

  test('Membuka picker saat diklik', () => {
    render(<QuickDatePicker label="Mulai" type="start" />);
    const pickerTrigger = screen.getByText('Pilih Tanggal').parentElement.parentElement;
    fireEvent.click(pickerTrigger);
    
    expect(screen.getByText('Tahun')).toBeDefined();
    expect(screen.getByText('Bulan')).toBeDefined();
    expect(screen.getByText('Tanggal')).toBeDefined();
  });

  test('Dropdown cascading: Bulan disabled sebelum Tahun dipilih', () => {
    render(<QuickDatePicker label="Mulai" type="start" />);
    fireEvent.click(screen.getByText('Pilih Tanggal').parentElement.parentElement);
    
    // Gunakan getAllByRole('combobox') untuk mendapatkan semua select
    const selects = screen.getAllByRole('combobox');
    expect(selects[1].disabled).toBe(true); // Month
    expect(selects[2].disabled).toBe(true); // Day
  });

  test('Memilih Tahun mengaktifkan Bulan', () => {
    render(<QuickDatePicker label="Mulai" type="start" />);
    fireEvent.click(screen.getByText('Pilih Tanggal').parentElement.parentElement);
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '2024' } });
    
    expect(selects[1].disabled).toBe(false);
  });

  test('Validasi Tahun Kabisat (Februari 2024 punya 29 hari)', () => {
    render(<QuickDatePicker label="Mulai" type="start" />);
    fireEvent.click(screen.getByText('Pilih Tanggal').parentElement.parentElement);
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '2024' } }); // Leap Year
    fireEvent.change(selects[1], { target: { value: '02' } });   // February
    
    const dayOptions = selects[2].querySelectorAll('option');
    expect(dayOptions.length).toBe(30); // 29 days + 1 placeholder
    expect(dayOptions[29].value).toBe('29');
  });

  test('Tombol Apply memanggil setTimeRange dengan format yang benar', () => {
    render(<QuickDatePicker label="Mulai" type="start" />);
    fireEvent.click(screen.getByText('Pilih Tanggal').parentElement.parentElement);
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '2024' } });
    fireEvent.change(selects[1], { target: { value: '05' } });
    fireEvent.change(selects[2], { target: { value: '15' } });
    
    const applyBtn = screen.getByText('Apply');
    fireEvent.click(applyBtn);
    
    expect(mockSetTimeRange).toHaveBeenCalledWith({
      start: '2024-05-15T00:00:00'
    });
  });

  test('Tombol Reset mengosongkan pilihan', () => {
    render(<QuickDatePicker label="Mulai" type="start" />);
    fireEvent.click(screen.getByText('Pilih Tanggal').parentElement.parentElement);
    
    const resetBtn = screen.getByText('Reset');
    fireEvent.click(resetBtn);
    
    expect(mockSetTimeRange).toHaveBeenCalledWith({
      start: null
    });
  });

  test('Komponen tidak dapat diklik jika isLocked=true', () => {
    useContextLockStore.mockReturnValue({
      timeRange: { start: null, end: null },
      setTimeRange: mockSetTimeRange,
      isLocked: true
    });
    
    render(<QuickDatePicker label="Mulai" type="start" />);
    const pickerTrigger = screen.getByText('Pilih Tanggal').parentElement.parentElement;
    fireEvent.click(pickerTrigger);
    
    // Picker tidak boleh muncul
    expect(screen.queryByText('Tahun')).toBeNull();
  });
});
