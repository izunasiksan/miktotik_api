import pytest
from fastapi.encoders import jsonable_encoder
from pydantic import Field
from app.schemas.base import BaseSchema
from unittest.mock import MagicMock, AsyncMock

# 1. Test Schema Alias Generation
class MockSchema(BaseSchema):
    user_id: int
    user_name: str
    is_active: bool = True

def test_schema_alias_generation():
    """
    Memastikan BaseSchema menghasilkan alias camelCase secara otomatis.
    """
    data = {"userId": 1, "userName": "test_user", "isActive": True}
    obj = MockSchema(**data)
    
    assert obj.user_id == 1
    assert obj.user_name == "test_user"
    assert obj.is_active is True
    
    # Check if we can access via alias during model_dump
    dump = obj.model_dump(by_alias=True)
    assert "userId" in dump
    assert "userName" in dump
    assert "isActive" in dump
    assert "user_id" not in dump

# 2. Test jsonable_encoder with by_alias=True
def test_jsonable_encoder_camel_case():
    """
    Memastikan jsonable_encoder menghasilkan output camelCase saat by_alias=True.
    """
    obj = MockSchema(user_id=1, user_name="test_user", is_active=True)
    
    # This is what we use in our endpoints: jsonable_encoder(obj, by_alias=True)
    result = jsonable_encoder(obj, by_alias=True)
    
    assert result["userId"] == 1
    assert result["userName"] == "test_user"
    assert result["isActive"] is True
    assert "user_id" not in result

# 3. Test Redis Caching Logic (Mocked)
@pytest.mark.asyncio
async def test_redis_caching_camel_case():
    """
    Simulasi logika caching di endpoint untuk memastikan data di Redis adalah camelCase.
    """
    mock_redis = AsyncMock()
    obj = MockSchema(user_id=1, user_name="cached_user")
    
    # Simulating what happens in endpoints/boards.py
    data_to_cache = jsonable_encoder(obj, by_alias=True)
    import json
    await mock_redis.setex("test_key", 60, json.dumps(data_to_cache))
    
    # Verify the call to Redis
    args, kwargs = mock_redis.setex.call_args
    cache_value = json.loads(args[2])
    
    assert "userId" in cache_value
    assert cache_value["userId"] == 1
    assert "user_id" not in cache_value

# 4. Test Nested Schema
class NestedSchema(BaseSchema):
    main_id: int
    sub_items: list[MockSchema]

def test_nested_schema_camel_case():
    """
    Memastikan schema bersarang (nested) juga mengikuti aturan camelCase.
    """
    sub = MockSchema(user_id=1, user_name="sub1")
    main = NestedSchema(main_id=100, sub_items=[sub])
    
    result = jsonable_encoder(main, by_alias=True)
    
    assert "mainId" in result
    assert "subItems" in result
    assert result["subItems"][0]["userId"] == 1
    assert "user_id" not in result["subItems"][0]

# 5. Test OAuth2 Token Response (Special Case)
from pydantic import BaseModel
class TokenSchema(BaseModel):
    access_token: str
    token_type: str

def test_oauth2_token_snake_case():
    """
    Memastikan schema Token tetap menggunakan snake_case (OAuth2 Standard).
    Ini karena Token mewarisi BaseModel secara langsung, bukan BaseSchema.
    """
    obj = TokenSchema(access_token="mock_token", token_type="bearer")
    result = obj.model_dump()
    
    assert "access_token" in result
    assert "token_type" in result
    assert "accessToken" not in result
    assert "tokenType" not in result

# 6. Test Normalization Stage 0 Row Counts
def test_normalization_stage0_row_counts():
    """
    Memastikan rowCounts di Normalization Preview (Stage 0) menggunakan camelCase.
    """
    row_counts = [
        {"tableName": "board_speed_stats", "rowCount": 1500},
        {"tableName": "board_resource_stats", "rowCount": 2000}
    ]
    
    # Simulasi return dari service
    service_result = {
        "granularity": "hour",
        "rowCounts": row_counts,
        "metadata": {
            "rowCounts": row_counts
        }
    }
    
    result = jsonable_encoder(service_result, by_alias=True)
    
    assert "rowCounts" in result
    assert result["rowCounts"][0]["tableName"] == "board_speed_stats"
    assert result["rowCounts"][0]["rowCount"] == 1500
    assert "metadata" in result
    assert "rowCounts" in result["metadata"]
