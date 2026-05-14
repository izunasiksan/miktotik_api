from pydantic import BaseModel, ConfigDict, AliasGenerator
from pydantic.alias_generators import to_camel

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=AliasGenerator(
            validation_alias=to_camel,    # Terima camelCase dari Frontend
            serialization_alias=to_camel, # Kirim camelCase ke Frontend
        ),
        populate_by_name=True,
        from_attributes=True,
    )
