# Reliability Checklist — FIT4110 Lab 03

Checklist hoàn thiện cho `team-iot` trước khi nộp Lab 03.

## 1. Functional Tests

- [x] Có test cho endpoint health: `GET /health`.
- [x] Có test happy path cho endpoint chính: `POST /sensors/readings`.
- [x] Có kiểm tra status code 2xx: `200` và `201`.
- [x] Có kiểm tra field quan trọng trong response: `status`, `service`, `time`, `id`, `createdAt`, `deviceId`, `sensorType`, `items`, `total`, `nextCursor`.
- [x] Có ít nhất 1 test đọc dữ liệu danh sách hoặc chi tiết: `GET /sensors/readings`, `GET /devices/{deviceId}/status`.

## 2. Auth Tests

- [x] Có test thiếu token: `POST /sensors/readings - missing token`.
- [x] Có test token hợp lệ: `POST /sensors/readings - valid bearer token`.
- [x] Có test sai token: `POST /sensors/readings - invalid token`.
- [x] Endpoint public được khai báo rõ nếu không cần auth: `GET /health` có `security: []` trong OpenAPI.
- [x] Test thể hiện đúng expected status 401/403: mock trả `401` cho request thiếu token.

Ghi chú: Prism mock không xác thực token thật như service local, nên test token sai cho phép mock trả response theo contract. Khi service thật chạy, test yêu cầu `401` hoặc `403`.

## 3. Negative Tests

- [x] Có test thiếu field bắt buộc: thiếu `deviceId`.
- [x] Có test sai giá trị ngoài miền: `limit=101`.
- [x] Có test sai enum hoặc giá trị ngoài miền qua schema contract: `sensorType`, `severity`, `eventType`, `unit`.
- [x] Lỗi trả về theo cùng một error model: `Problem` qua `application/problem+json`.

## 4. Boundary Tests

- [x] Có test min/max hoặc dữ liệu sát ngưỡng: high temperature boundary `value=80`.
- [x] Có test limit/pagination nếu endpoint có danh sách: `limit=101` và các response có `nextCursor`.
- [x] Có test metadata/field optional: payload có `locationId`; schema có `correlationId`, `zoneId`, `batchId`.
- [x] Có ghi chú kỳ vọng xử lý dữ liệu biên: boundary test chấp nhận `201`, `400` hoặc `422` và kiểm tra response tương ứng.

## 5. Reliability Tests Cơ Bản

- [x] Có kiểm tra response time: local-only non-functional test `GET /health - local response time`.
- [x] Có mô tả timeout mong muốn: local response time dưới `1000ms` khi service thật chạy.
- [x] Có test hoặc ghi chú retry/idempotency nếu phù hợp: event schemas mô tả `eventId` dùng làm idempotency key khi provider retry/publish lại.
- [x] Có consumer-side smoke test với mock provider IoT cho consumer: Analytics gọi `GET /telemetry`, Core gọi `GET /events`.

Ghi chú local: tại thời điểm kiểm tra, service thật ở `http://localhost:8000` chưa chạy, nên `npm.cmd run test:local` tự khởi động Prism mock trên port `8000` để chạy collection với local environment. Report `reports/newman-report-local.xml` chứng minh local environment chạy được, nhưng chưa chứng minh service thật đã hoàn thiện.

## 6. Evidence

- [x] Collection export JSON: `postman/collections/team-iot.postman_collection.json`.
- [x] Environment mock export JSON: `postman/environments/team-iot_mock.postman_environment.json`.
- [x] Environment local export JSON: `postman/environments/team-iot_local.postman_environment.json`.
- [x] Newman report XML/HTML: `reports/newman-report.xml`, `reports/newman-report.html`, `reports/newman-report-local.xml`.
- [x] Contract lint report: `reports/contract-lint-report.txt`.
- [x] Test-case matrix đã điền: `templates/test-case-matrix.csv`.
- [x] Biên bản handshake đã điền: `templates/consumer-provider-handshake.md`.

## 7. Kết Quả Kiểm Tra

- Contract lint: `No results with a severity of 'error' found!`
- Newman mock: 14 requests, 23 assertions, 0 failed.
- Newman local environment: 14 requests, 23 assertions, 0 failed, chạy qua Prism fallback trên port `8000` khi service thật chưa bật.
- Local service thật: chưa có service thật chạy ở `http://localhost:8000`, cần chạy lại khi service hoàn thiện để có bằng chứng service thật.
