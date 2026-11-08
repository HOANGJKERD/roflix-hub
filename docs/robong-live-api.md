# RoBong Live API

Endpoint riêng cho phần xem trực tiếp / stream trong RoBong.

```
GET /api/robong-live
```

## Resources

| Query | Mô tả |
|-------|--------|
| `?resource=channels` | Danh sách kênh (mặc định) |
| `?resource=channels&group=FIFA WORLD CUP 2026` | Lọc theo nhóm |
| `?resource=groups` | Danh sách nhóm + số lượng kênh |
| `?resource=play&id=vtv3hd` | Lấy link stream thật của 1 kênh |

## Ví dụ response `channels`

```json
{
  "ok": true,
  "api": "RoBong Live",
  "version": "1.0.0",
  "fetchedAt": "2026-11-08T06:00:00.000Z",
  "resource": "channels",
  "count": 8,
  "items": [
    {
      "id": "vtv3hd",
      "name": "VTV3",
      "group": "FIFA WORLD CUP 2026",
      "logo": "https://...",
      "type": "flv",
      "source": "curated",
      "hasStream": true
    }
  ]
}
```

## Ví dụ response `play`

```json
{
  "ok": true,
  "api": "RoBong Live",
  "resource": "play",
  "item": {
    "id": "vtv3hd",
    "name": "VTV3",
    "group": "FIFA WORLD CUP 2026",
    "logo": "https://...",
    "url": "http://...",
    "type": "flv",
    "headers": {},
    "source": "curated"
  }
}
```

## Ghi chú

- Danh sách kênh hiện tại là **curated** (lấy từ playlist công khai, đã làm sạch).
- Link stream chỉ trả khi gọi `resource=play` để tránh lộ hàng loạt.
- Có thể mở rộng thêm remote M3U trong mảng `REMOTE_M3U` của `api/robong-live.js`.
- Các domain/stream bên thứ ba có thể chết bất cứ lúc nào; RoBong không tự tạo link giả.

## Tích hợp frontend

```js
// Lấy danh sách kênh
const res = await fetch('/api/robong-live?resource=channels');
const data = await res.json();

// Lấy link xem
const play = await fetch('/api/robong-live?resource=play&id=vtv3hd');
const { item } = await play.json();
// item.url + item.headers → đưa vào player (hls.js / flv.js / video.js)
```
