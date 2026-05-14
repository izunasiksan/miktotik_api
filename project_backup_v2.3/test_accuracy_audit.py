import asyncio
from datetime import datetime, timedelta
from uuid import uuid4

def calculate_accuracy_v21(samples, granularity, raw_acc=100.0):
    # Fixed logic
    threshold_map = {
        'year': 365 * 24 * 60,   # Minute to Year
        'month': 30 * 24 * 60,   # Minute to Month
        'day': 24 * 60,          # Minute to Day
        'hour': 60,               # Minute to Hour
    }
    T = threshold_map.get(granularity, 1)
    
    accuracy_pct = min(100.0, (samples / T) * raw_acc) if T > 1 else raw_acc
    return accuracy_pct

def test_accuracy():
    print("Testing Current Accuracy Logic:")
    
    # Case 1: Hour granularity, raw data is minute. Expect 60 samples for 100%
    # If we have 30 minutes of data:
    acc = calculate_accuracy_v21(30, 'hour')
    print(f"Hour (30/60 samples): {acc}% (Expected: 50%)")
    
    # Case 2: Day granularity, raw data is minute. Expect 1440 samples for 100%
    # But current code uses T=24 (assuming input is hours)
    # If we have 24 minutes of data:
    acc = calculate_accuracy_v21(24, 'day')
    print(f"Day (24/1440 minutes): {acc}% (Current: {acc}%, Expected: ~1.67%)")
    
    # Case 3: Month granularity, raw data is minute. Expect 43200 samples for 100%
    # But current code uses T=30 (assuming input is days)
    # If we have 30 minutes of data:
    acc = calculate_accuracy_v21(30, 'month')
    print(f"Month (30/43200 minutes): {acc}% (Current: {acc}%, Expected: ~0.07%)")

if __name__ == "__main__":
    test_accuracy()
