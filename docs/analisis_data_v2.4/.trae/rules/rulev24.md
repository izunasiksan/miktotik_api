---
alwaysApply: true
---
**V2.4.1 Naming Convention & API Rules**:
1. Frontend request menggunakan camelCase.
2. API response menggunakan camelCase.
3. Backend Python menggunakan snake_case secara internal.
4. Database menggunakan snake_case.
5. Konversi otomatis dilakukan oleh Pydantic `alias_generator=to_camel` di `BaseSchema`.
6. Untuk endpoint yang menggunakan `jsonable_encoder`, WAJIB menyertakan `by_alias=True` untuk memastikan output camelCase.

append logv2.4.2