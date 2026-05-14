# UPDATE 2.4.1 Sinkronisasi Naming Convention (camelCase)
from typing import Any, List
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,  # UPDATE 2.4.1 Use simple alias_generator for both validation and serialization
        populate_by_name=True,
        from_attributes=True,
    )


class ErrorDetail(BaseSchema):
    code: str
    message: str


class ApiResponse(BaseSchema):
    status: str = "success"
    message: str = "Operation successful"
    data: Any = None
    errors: List[ErrorDetail] = []
