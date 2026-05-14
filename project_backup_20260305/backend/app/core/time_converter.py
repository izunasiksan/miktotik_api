from enum import Enum
from typing import List, Union, Dict, Any

class TimeUnits(str, Enum):
    MONTH = "month"
    DAY = "day"
    HOUR = "hour"
    MINUTE = "minute"
    SECOND = "second"

THRESHOLDS = {
    TimeUnits.MONTH: {"sub": TimeUnits.DAY, "size": 30},
    TimeUnits.DAY: {"sub": TimeUnits.HOUR, "size": 24},
    TimeUnits.HOUR: {"sub": TimeUnits.MINUTE, "size": 60},
    TimeUnits.MINUTE: {"sub": TimeUnits.SECOND, "size": 60}
}

def convert_time_scale(
    values: Union[float, List[float]], 
    unit_from: str, 
    unit_to: str
) -> Dict[str, Any]:
    """
    Logika Konversi Waktu Otomatis (Backend Version)
    Berdasarkan: docs/analisis data v2/global/aturan_konversi_waktu_V2.1.md
    """
    # 1. Validasi Input
    try:
        u_from = TimeUnits(unit_from)
        u_to = TimeUnits(unit_to)
    except ValueError:
        raise ValueError(f"Satuan tidak valid: {unit_from} -> {unit_to}")

    # Normalisasi input ke list
    data_list = values if isinstance(values, list) else [values]
    if not data_list:
        return {
            "value": 0.0,
            "accuracy": "0% akurat",
            "is_warning": True,
            "message": "Data kosong"
        }

    # Hitung rata-rata awal
    avg_value = sum(data_list) / len(data_list)

    # Jika satuan sama
    if u_from == u_to:
        return {
            "value": avg_value,
            "accuracy": "100% akurat",
            "is_warning": False,
            "message": "Satuan sama, tidak ada konversi"
        }

    # 2. Logika Konversi Otomatis
    target_threshold = THRESHOLDS.get(u_to)

    # Cek apakah konversi 1 tingkat ke atas (misal: day -> month)
    if target_threshold and target_threshold["sub"] == u_from:
        T = target_threshold["size"]
        count = len(data_list)
        accuracy_pct = min(100, round((count / T) * 100))
        
        return {
            "value": avg_value,
            "accuracy": f"{accuracy_pct}% akurat",
            "is_warning": accuracy_pct < 100,
            "message": f"telah dikonversi hanya {accuracy_pct}% akurat" if accuracy_pct < 100 else "100% akurat"
        }

    # 3. Penanganan konversi multi-level (Fallback)
    return {
        "value": avg_value,
        "accuracy": "Konversi tidak didukung",
        "is_warning": True,
        "message": f"Sistem saat ini hanya mendukung konversi 1 tingkat (misal: {unit_from} ke {target_threshold['sub'] if target_threshold else 'satuan di atasnya'})"
    }
