# Consumer-Provider Handshake

## Thông tin chung

- Lab: FIT4110 Lab 03
- Ngày: 2026-05-19
- Provider team: team-iot
- Consumer team: team-core, team-analytics
- Provider service: IoT Ingestion
- Consumer service:
  - Core Business: nhận sensor events và threshold events để xử lý policy/alert.
  - Analytics: nhận telemetry events và device status để tổng hợp metric.

## Contract

- Contract file: `contracts/team-iot.openapi.yaml`
- Mock base URL: `http://localhost:4010`
- Local base URL: `http://localhost:8000`
- Auth method: HTTP Bearer token, dùng environment variable `authToken`
- Postman collection: `postman/collections/team-iot.postman_collection.json`
- Mock environment: `postman/environments/team-iot_mock.postman_environment.json`
- Local environment: `postman/environments/team-iot_local.postman_environment.json`

## Endpoint được thỏa thuận

| Consumer | Endpoint | Method | Mục đích | Expected status |
|---|---|---:|---|---:|
| Core Business | `/sensors/readings` | GET | Truy vấn sensor readings theo `deviceId`, `sensorType`, `limit` | 200 |
| Core Business | `/sensors/threshold-exceeded` | GET | Truy vấn event vượt ngưỡng theo `severity` | 200 |
| Core Business | `/events` | GET | Backfill IoT events theo `eventType` | 200 |
| Analytics | `/telemetry` | GET | Truy vấn telemetry để tổng hợp theo giờ/ngày | 200 |
| Analytics | `/devices/{deviceId}/status` | GET | Lấy trạng thái online/offline/maintenance của device | 200 |

## Smoke test 1: Analytics consume telemetry

### Request

```http
GET /telemetry?deviceId=SENSOR-001&limit=1
Authorization: Bearer {{authToken}}
```

### Expected response

```json
{
  "items": [
    {
      "eventId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babc",
      "eventType": "telemetry.ingested",
      "timestamp": "2026-05-12T10:30:00Z",
      "source": "iot-ingestion",
      "data": {
        "deviceId": "SENSOR-001",
        "sensorType": "temperature",
        "value": 38.5,
        "unit": "celsius",
        "timestamp": "2026-05-12T10:30:00Z",
        "zoneId": "ZONE-A",
        "batchId": "BATCH-2026-05-12-001"
      }
    }
  ],
  "total": 1,
  "nextCursor": null
}
```

### Kiểm tra phía consumer

- Analytics parse được `items[]`.
- Analytics parse được `data.deviceId`, `data.sensorType`, `data.value`, `data.unit`, `data.timestamp`.
- Nếu `data.zoneId` bằng `null`, Analytics fallback vào nhóm `unknown_zone`.

## Smoke test 2: Core consume IoT events

### Request

```http
GET /events?eventType=sensor.reading.created&limit=1
Authorization: Bearer {{authToken}}
```

### Expected response

```json
{
  "items": [
    {
      "eventId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babc",
      "eventType": "sensor.reading.created",
      "timestamp": "2026-05-12T10:30:00Z",
      "source": "iot-ingestion",
      "data": {
        "id": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babc",
        "deviceId": "SENSOR-001",
        "sensorType": "temperature",
        "value": 38.5,
        "unit": "celsius",
        "timestamp": "2026-05-12T10:30:00Z",
        "locationId": "ZONE-A-01",
        "createdAt": "2026-05-12T10:30:01Z"
      }
    }
  ],
  "total": 1,
  "nextCursor": null
}
```

### Kiểm tra phía consumer

- Core parse được `items[]`.
- Core dùng `eventId` làm idempotency key khi provider retry/publish lại.
- Core parse được `eventType` để route sang policy tương ứng.
- Core parse được `data.deviceId`, `data.sensorType`, `data.value`, `data.timestamp`.

## Error handling được thỏa thuận

| Trường hợp | Provider response | Consumer behavior |
|---|---:|---|
| Thiếu hoặc sai bearer token | 401 hoặc 403 | Không retry liên tục; log auth error và cảnh báo cấu hình token |
| Query parameter không hợp lệ, ví dụ `limit=101` | 400 hoặc 422 | Không retry; sửa request theo contract |
| Device không tồn tại | 404 | Hiển thị unavailable/unknown device, không làm crash workflow |
| Provider lỗi tạm thời | 500 | Retry có backoff nếu workflow cho phép |

Error response dùng Problem shape:

```json
{
  "type": "https://iot.campus.local/errors/validation",
  "title": "Dữ liệu không hợp lệ",
  "status": 400,
  "detail": "Payload không đúng JSON Schema",
  "errors": []
}
```

## Kết quả

- [x] Consumer smoke test cho Analytics đã gọi mock thành công qua `GET /telemetry`.
- [x] Consumer smoke test cho Core đã gọi mock thành công qua `GET /events`.
- [x] Consumer parse được field cần dùng trong response.
- [x] Consumer hiểu lỗi 4xx/5xx provider trả về theo Problem shape.
- [x] Có Newman report trong `reports/newman-report.xml`, `reports/newman-report.html` và `reports/newman-report-local.xml`.

Evidence:

- Newman mock run: 14 requests, 23 assertions, 0 failed.
- Newman local environment run: 14 requests, 23 assertions, 0 failed, chạy qua Prism fallback trên port `8000` khi service thật chưa bật.
- Contract lint: `reports/contract-lint-report.txt`.

## Ghi chú thay đổi hợp đồng

| Nội dung | Trước | Sau | Người đồng ý |
|---|---|---|---|
| Endpoint create/list reading | Contract mẫu dùng `/readings`, `/readings/latest` | Contract team-iot dùng `/sensors/readings` | team-iot, team-core, team-analytics |
| Field reading | Contract mẫu dùng `device_id`, `metric`, `reading_id`, `created_at` | Contract team-iot dùng `deviceId`, `sensorType`, `id`, `createdAt` | team-iot, team-core, team-analytics |
| Consumer smoke | Template chưa gắn endpoint cụ thể | Thêm `/telemetry` cho Analytics và `/events` cho Core | team-iot, team-core, team-analytics |

## Xác nhận

- Provider representative: team-iot
- Consumer representative: team-core, team-analytics
- Trạng thái: Accepted for Lab 03 mock contract testing
