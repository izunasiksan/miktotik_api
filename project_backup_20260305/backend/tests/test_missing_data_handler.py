import pytest
import numpy as np
from app.core.missing_data_handler import MissingDataHandler, ImputationStrategy

@pytest.fixture
def handler():
    return MissingDataHandler()

def test_detect_missing_data(handler):
    data = [1.0, 2.0, None, 4.0, np.nan, 6.0]
    result = handler.detect_missing_data(data)
    
    assert result["total_count"] == 6
    assert result["missing_count"] == 2
    assert result["missing_percentage"] == pytest.approx(1/3)
    assert result["status"] == "CRITICAL" # > 0.30
    assert result["completeness_score"] == pytest.approx(2/3)

def test_select_strategy(handler):
    # Case: Low missing percentage (< 1%)
    strategy = handler.select_strategy("numeric", 0.005, is_timeseries=True)
    assert strategy == ImputationStrategy.LISTWISE_DELETION
    
    # Case: 1% - 5% (Caution Zone) -> Forward Fill
    strategy = handler.select_strategy("numeric", 0.03, is_timeseries=True)
    assert strategy == ImputationStrategy.FORWARD_FILL
    
    # Case: 5% - 15% (Caution/Risky Zone) -> Regression
    strategy = handler.select_strategy("numeric", 0.10, is_timeseries=True)
    assert strategy == ImputationStrategy.REGRESSION

    # Case: > 15% (Risky Zone) -> Linear Interpolation
    strategy = handler.select_strategy("numeric", 0.2, is_timeseries=True)
    assert strategy == ImputationStrategy.LINEAR_INTERPOLATION

def test_handle_missing_data_forward_fill(handler):
    data = [1.0, None, 3.0, None, 5.0]
    result = handler.handle_missing_data(data, ImputationStrategy.FORWARD_FILL)
    assert result == [1.0, 1.0, 3.0, 3.0, 5.0]

def test_handle_missing_data_linear_interpolation(handler):
    data = [1.0, None, 3.0, None, 5.0]
    result = handler.handle_missing_data(data, ImputationStrategy.LINEAR_INTERPOLATION)
    # 1.0, 2.0, 3.0, 4.0, 5.0
    assert result == [1.0, 2.0, 3.0, 4.0, 5.0]

def test_validate_imputation(handler):
    original = [1.0, 2.0, 3.0, 4.0, 5.0]
    imputed = [1.0, 2.1, 3.0, 4.2, 5.0]
    
    metrics = handler.validate_imputation(original, imputed)
    
    assert "rmse" in metrics
    assert "mae" in metrics
    assert metrics["rmse"] > 0
    assert metrics["mae"] > 0

def test_validate_imputation_mismatch(handler):
    original = [1.0, 2.0]
    imputed = [1.0, 2.0, 3.0]
    
    result = handler.validate_imputation(original, imputed)
    assert "error" in result
    assert result["error"] == "Length mismatch"
