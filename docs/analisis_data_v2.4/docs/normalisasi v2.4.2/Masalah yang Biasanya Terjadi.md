Masalah yang Biasanya Terjadi

Masalah muncul saat frontend camelCase → backend snake_case.

Contoh sekarang di kode kamu:

const payload = {
  boardId: selectedBoardId,
  interfaceName: selectedInterfaceName,
  startTime: timeRange.start,
  endTime: timeRange.end
};

Backend Python biasanya expect:

board_id
interface_name
start_time
end_time

Kalau backend tidak punya alias mapping, request bisa gagal.

Solusi yang Dipakai Sistem Production

Ada 3 cara umum.

1️⃣ Mapping di Service Layer (Paling Aman)

Frontend tetap camelCase.

Service API yang convert.

Contoh:

export const postNormalizationPreview = async (payload) => {
  const body = {
    board_id: payload.boardId,
    interface_name: payload.interfaceName,
    start_time: payload.startTime,
    end_time: payload.endTime,
    granularity: payload.granularity,
    agg: payload.agg,
    bucket_source: payload.bucketSource,
    usage_unit: payload.usageUnit,
    fill_gaps: payload.fillGaps
  };

  const res = await api.post('/analysis/normalization-preview', body);
  return res.data;
};

Jadi komponen React tetap clean.

2️⃣ Backend Alias Mapping (FastAPI Best Practice)

Jika backend kamu pakai:

FastAPI

Pydantic

bisa pakai alias.

Contoh:

class NormalizationRequest(BaseModel):
    board_id: int = Field(alias="boardId")
    interface_name: str | None = Field(alias="interfaceName")
    start_time: datetime = Field(alias="startTime")
    end_time: datetime = Field(alias="endTime")

    class Config:
        populate_by_name = True

Jadi backend bisa menerima:

boardId
atau
board_id
3️⃣ Auto Converter Middleware

Beberapa sistem memakai converter:

camelCase → snake_case
snake_case → camelCase

Library JS seperti:

camelcase-keys
snakecase-keys
Rekomendasi untuk Sistem Kamu

Melihat arsitektur kamu:

Python backend

normalization pipeline

React frontend

struktur paling stabil:

Database        snake_case
Backend model   snake_case
API payload     snake_case
Frontend state  camelCase

Artinya konversi dilakukan di service API.

Contoh Flow yang Ideal
React component
boardId
startTime
endTime

↓

API service
board_id
start_time
end_time

↓

Backend Python
board_id
start_time
end_time
Kesimpulan

✔ CamelCase di JS sudah benar
✔ Snake_case di backend sudah benar

Yang penting:

JS camelCase
↓
API service convert
↓
Python snake_case

💡 Satu hal menarik dari kode kamu:
komponen NormalizationStage ini sebenarnya sudah mirip UI pipeline yang dipakai di observability dashboard profesional.