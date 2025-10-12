# Driver Management - Quick Start Card

## 🚀 3-Minute Setup

### 1. Run Migration
```bash
npm run migrate
```

### 2. Generate Driver
```javascript
const response = await fetch('/api/drivers/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "My Custom Device",
    deviceType: "custom_matrix",
    protocolType: "udp",  // tcp, udp, serial, http, websocket, mqtt
    description: "UDP port 5000. ROUTE {in} {out} to route. OK response.",
    provider: "gemini"  // Free!
  })
});
```

### 3. Deploy
```javascript
await fetch(`/api/drivers/${driverId}/deploy`, {
  method: 'POST',
  body: JSON.stringify({ controllerId: '...' })
});
```

---

## 📖 Common Examples

### TCP DSP (Like Harvey/Biamp)
```json
{
  "name": "Custom DSP",
  "protocolType": "tcp",
  "connectionConfig": {"port": 23},
  "description": "TCP port 23. SET {block} {value}\\r\\n for commands. +OK response."
}
```

### UDP Matrix Switcher
```json
{
  "protocolType": "udp",
  "connectionConfig": {"port": 44444},
  "description": "UDP port 44444. ROUTE {input} {output}. OK or ERROR response."
}
```

### Serial Device
```json
{
  "protocolType": "serial",
  "connectionConfig": {"port": "/dev/ttyUSB0", "baudRate": 9600},
  "description": "Serial 9600 baud. Commands: V{channel}:{value}. Response: ACK."
}
```

---

## 🔗 API Endpoints

| Action | Endpoint |
|--------|----------|
| Generate | `POST /api/drivers/generate` |
| List | `GET /api/drivers` |
| Details | `GET /api/drivers/:id` |
| Validate | `POST /api/drivers/:id/validate` |
| Deploy | `POST /api/drivers/:id/deploy` |
| Refine | `POST /api/drivers/:id/refine` |

---

## 💰 Cost

- **Gemini**: FREE (use for testing)
- **Claude**: $0.05-$0.30 per driver (production quality)
- **GPT-4**: $0.20-$0.60 per driver

---

## 📁 Files

- Migration: `db/migrations/004_driver_management.sql`
- Generator: `src/ai/driver-generator.js`
- Routes: `src/routes/drivers.js`
- Full Guide: `DRIVER_MANAGEMENT_GUIDE.md`

---

## ⚡ Next Steps

1. Run migration ✅
2. Test with Gemini (free)
3. Build frontend UI
4. Implement NUC loader

---

**Status**: Backend Ready | Frontend Pending | NUC Pending
