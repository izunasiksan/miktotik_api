import unittest
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from datetime import datetime, timedelta
from app.services.normalization_v2 import _build_timeline, _normalize_traffic, _normalize_resource

class TestNormalizationV2(unittest.TestCase):
    def test_build_timeline_day(self):
        start = datetime(2026, 3, 1)
        end = datetime(2026, 3, 5)
        tl = _build_timeline(start, end, "day")
        self.assertEqual(len(tl), 4)
        self.assertEqual(tl[0].day, 1)
        self.assertEqual(tl[-1].day, 4)

    def test_normalize_traffic_fill_gaps(self):
        start = datetime(2026, 3, 1)
        end = datetime(2026, 3, 4)
        dl = [
            {"period": "2026-03-01T00:00:00", "value": 10.0},
            {"period": "2026-03-03T00:00:00", "value": 30.0},
        ]
        ul = [
            {"period": "2026-03-01T00:00:00", "value": 5.0},
            {"period": "2026-03-02T00:00:00", "value": 7.0},
            {"period": "2026-03-03T00:00:00", "value": 9.0},
        ]
        rows, meta = _normalize_traffic(dl, ul, start, end, "day", "Mbps", True)
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0]["rx"], 10.0)
        self.assertEqual(rows[0]["tx"], 5.0)
        self.assertTrue(rows[1]["isGap"] in [True, False])
        self.assertGreaterEqual(meta["gapCount"], 0)

    def test_normalize_resource_clamp_cpu(self):
        start = datetime(2026, 3, 1)
        end = datetime(2026, 3, 3)
        cpu = [
            {"period": "2026-03-01T00:00:00", "value": 120},
            {"period": "2026-03-02T00:00:00", "value": -10},
            {"period": "2026-03-02T00:00:00", "value": 50},
        ]
        mem = [{"period": "2026-03-01T00:00:00", "value": 1024}]
        rows, meta = _normalize_resource(cpu, mem, start, end, "day", True)
        self.assertEqual(len(rows), 2)
        self.assertGreaterEqual(rows[0]["cpu_percent_standard"], 0.0)
        self.assertLessEqual(rows[0]["cpu_percent_standard"], 100.0)
        self.assertIn("gapCount", meta)

if __name__ == "__main__":
    unittest.main()
