import pytest
from app.core.time_converter import convert_time_scale, TimeUnits

def test_convert_day_to_month_full():
    # Skenario 1: Hari ke Bulan (30 Hari) - 100%
    data = [100.0] * 30
    result = convert_time_scale(data, "day", "month")
    assert result["value"] == 100.0
    assert result["accuracy"] == "100% akurat"
    assert result["is_warning"] is False

def test_convert_day_to_month_partial():
    # Skenario 2: Hari ke Bulan (7 Hari) - 23%
    data = [100.0] * 7
    result = convert_time_scale(data, "day", "month")
    assert result["value"] == 100.0
    assert result["accuracy"] == "23% akurat"
    assert result["is_warning"] is True
    assert "23% akurat" in result["message"]

def test_convert_hour_to_day_full():
    # Skenario 3: Jam ke Hari (24 Jam) - 100%
    data = [100.0] * 24
    result = convert_time_scale(data, "hour", "day")
    assert result["value"] == 100.0
    assert result["accuracy"] == "100% akurat"
    assert result["is_warning"] is False

def test_convert_hour_to_day_partial():
    # Skenario 4: Jam ke Hari (7 Jam) - 29%
    data = [100.0] * 7
    result = convert_time_scale(data, "hour", "day")
    assert result["value"] == 100.0
    assert result["accuracy"] == "29% akurat"
    assert result["is_warning"] is True

def test_convert_minute_to_hour_full():
    # Skenario 5: Menit ke Jam (60 Menit) - 100%
    data = [100.0] * 60
    result = convert_time_scale(data, "minute", "hour")
    assert result["value"] == 100.0
    assert result["accuracy"] == "100% akurat"

def test_convert_second_to_minute_partial():
    # Skenario 8: Detik ke Menit (15 Detik) - 25%
    data = [100.0] * 15
    result = convert_time_scale(data, "second", "minute")
    assert result["value"] == 100.0
    assert result["accuracy"] == "25% akurat"

def test_invalid_unit():
    # Skenario 9: Validasi Input (Satuan Tidak Valid)
    with pytest.raises(ValueError, match="Satuan tidak valid"):
        convert_time_scale([1, 2, 3], "invalid", "day")

def test_empty_data():
    # Skenario 10: Data Kosong
    result = convert_time_scale([], "day", "month")
    assert result["value"] == 0.0
    assert result["accuracy"] == "0% akurat"
    assert result["is_warning"] is True
