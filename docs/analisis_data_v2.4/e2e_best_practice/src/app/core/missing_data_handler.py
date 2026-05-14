from enum import Enum
from typing import Any, Dict, List, Optional

import numpy as np


class MissingDataType(Enum):
    MCAR = "MCAR"  # Missing Completely at Random
    MAR = "MAR"  # Missing at Random
    MNAR = "MNAR"  # Missing Not at Random


class ImputationStrategy(Enum):
    LISTWISE_DELETION = "listwise_deletion"
    MEAN = "mean"
    MEDIAN = "median"
    MODE = "mode"
    LINEAR_INTERPOLATION = "linear_interpolation"
    FORWARD_FILL = "forward_fill"
    BACKWARD_FILL = "backward_fill"
    REGRESSION = "regression"
    MULTIPLE_IMPUTATION = "multiple_imputation"


class MissingDataHandler:
    def __init__(
        self,
        threshold_caution: float = 0.05,
        threshold_risky: float = 0.15,
        threshold_critical: float = 0.30,
    ):
        self.threshold_caution = threshold_caution
        self.threshold_risky = threshold_risky
        self.threshold_critical = threshold_critical

    def detect_missing_data(self, data: List[Optional[float]]) -> Dict[str, Any]:
        """
        Mendeteksi jumlah dan persentase missing data.
        """
        total_count = len(data)
        missing_count = sum(
            1 for x in data if x is None or (x != x)
        )
        missing_percentage = missing_count / total_count if total_count > 0 else 0

        status = "SAFE"
        if missing_percentage > self.threshold_critical:
            status = "CRITICAL"
        elif missing_percentage > self.threshold_risky:
            status = "RISKY"
        elif missing_percentage > self.threshold_caution:
            status = "CAUTION"

        # V2.4.2: Gap Anchor Analysis
        # Check if there's at least one valid data point before and after the gaps
        # NaN check: x == x is False if x is NaN
        first_valid_idx = next((i for i, x in enumerate(data) if x is not None and x == x), None)
        last_valid_idx = next((i for i in range(len(data)-1, -1, -1) if data[i] is not None and data[i] == data[i]), None)
        
        has_anchor_before = first_valid_idx is not None and first_valid_idx > 0
        has_anchor_after = last_valid_idx is not None and last_valid_idx < len(data) - 1
        
        # If there are no valid points at all, imputation is not really "possible" in a meaningful way
        imputation_possible = first_valid_idx is not None

        # V2.4.2: Gap Segmentation
        gap_segments = []
        current_gap = []
        for i, x in enumerate(data):
            if x is None or x != x:  # is None or is NaN
                current_gap.append(i)
            else:
                if current_gap:
                    gap_segments.append(current_gap)
                    current_gap = []
        if current_gap:
            gap_segments.append(current_gap)

        gap_count = len(gap_segments)
        gap_lengths = [len(g) for g in gap_segments]
        max_gap_length = max(gap_lengths) if gap_lengths else 0
        avg_gap_length = sum(gap_lengths) / gap_count if gap_count > 0 else 0

        return {
            "total_count": total_count,
            "missing_count": missing_count,
            "missing_percentage": missing_percentage,
            "status": status,
            "completeness_score": 1.0 - missing_percentage,
            "gap_analysis": {
                "has_anchor_before": has_anchor_before,
                "has_anchor_after": has_anchor_after,
                "imputation_possible": imputation_possible,
                "first_valid_index": first_valid_idx,
                "last_valid_index": last_valid_idx,
                "gap_count": gap_count,
                "max_gap_length": max_gap_length,
                "avg_gap_length": avg_gap_length,
                "gap_segments": gap_segments
            }
        }

    def select_strategy(
        self, data_type: str, missing_percentage: float, is_timeseries: bool = True
    ) -> ImputationStrategy:
        """
        Algoritma pemilihan strategi berdasarkan karakteristik data dan persentase missing
        sesuai Aturan V2.1.
        """
        if missing_percentage < 0.01:
            return ImputationStrategy.LISTWISE_DELETION

        if missing_percentage <= self.threshold_caution:
            # 1% - 5%: FFill or Linear
            return (
                ImputationStrategy.FORWARD_FILL
                if is_timeseries
                else ImputationStrategy.MEAN
            )

        if missing_percentage <= self.threshold_risky:
            # 5% - 15%: Regression or Multiple Imputation
            return ImputationStrategy.REGRESSION

        # > 15%: Linear Interpolation (Risky/Critical Zone)
        return (
            ImputationStrategy.LINEAR_INTERPOLATION
            if is_timeseries
            else ImputationStrategy.MEDIAN
        )

    def handle_missing_data(
        self, data: List[Optional[float]], strategy: ImputationStrategy
    ) -> List[float]:
        """
        Implementasi dasar imputasi data.
        """
        if not data:
            return []

        # Convert to numpy array for easier handling
        arr = np.array([x if x is not None else np.nan for x in data])

        if strategy == ImputationStrategy.FORWARD_FILL:
            mask = np.isnan(arr)
            idx = np.where(~mask, np.arange(len(mask)), 0)
            np.maximum.accumulate(idx, out=idx)
            return arr[idx].tolist()

        elif strategy == ImputationStrategy.LINEAR_INTERPOLATION:
            mask = np.isnan(arr)
            if not np.any(~mask):
                return [0.0] * len(data)  # Fallback if all are NaN

            xp = np.where(~mask)[0]
            fp = arr[~mask]
            x = np.arange(len(arr))
            return np.interp(x, xp, fp).tolist()

        elif strategy == ImputationStrategy.MEAN:
            mean_val = np.nanmean(arr) if not np.all(np.isnan(arr)) else 0.0
            return np.where(np.isnan(arr), mean_val, arr).tolist()

        elif strategy == ImputationStrategy.MEDIAN:
            median_val = np.nanmedian(arr) if not np.all(np.isnan(arr)) else 0.0
            return np.where(np.isnan(arr), median_val, arr).tolist()

        return [x if x is not None and not np.isnan(x) else 0.0 for x in data]

    def validate_imputation(
        self, original_valid_data: List[float], imputed_data: List[float]
    ) -> Dict[str, Any]:
        """
        Validasi hasil imputasi menggunakan RMSE dan MAE.
        """
        orig = np.array(original_valid_data)
        impu = np.array(imputed_data)

        if len(orig) != len(impu):
            return {"error": "Length mismatch"}

        rmse = np.sqrt(np.mean((orig - impu) ** 2))
        mae = np.mean(np.abs(orig - impu))

        return {"rmse": float(rmse), "mae": float(mae)}
