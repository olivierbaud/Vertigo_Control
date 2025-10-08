# Railway Environment Variables Setup

## Required Variables (Already Set)
✅ `DATABASE_URL` - Automatically set by Railway PostgreSQL
✅ `PORT` - Automatically set by Railway
✅ `NODE_ENV` - Set to `production`

## Optional but Recommended

### 1. ENCRYPTION_KEY (for BYOK feature)
**Purpose:** Encrypts user-provided API keys (Bring Your Own Key)

**Generate a key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Add to Railway:**
1. Go to your Railway project
2. Click on "Variables" tab
3. Add: `ENCRYPTION_KEY` = `<generated-key>`

**Without this:** BYOK feature disabled, but server runs fine with platform keys.

---

### 2. AI Provider API Keys (Platform Keys)

Add these if you want to provide AI credits to your users:

#### Anthropic Claude (Recommended)
```
ANTHROPIC_API_KEY=sk-ant-...
```
Get key: https://console.anthropic.com/settings/keys

#### OpenAI GPT-4
```
OPENAI_API_KEY=sk-...
```
Get key: https://platform.openai.com/api-keys

#### Google Gemini (FREE)
```
GEMINI_API_KEY=...
```
Get key: https://aistudio.google.com/app/apikey

**Priority:** If users provide BYOK, their key is used. Otherwise, platform key is used.

---

### 3. Cloudflare R2 (for image uploads)

**Purpose:** Store images used in GUIs

```
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=vertigo-control-images
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

**Setup R2:**
1. Go to Cloudflare Dashboard → R2
2. Create bucket: `vertigo-control-images`
3. Go to "Manage R2 API Tokens"
4. Create API token with read/write permissions
5. Copy credentials to Railway

**Without this:** Image upload API returns 503, but server runs fine.

---

## Current Status

**Server will start with:** ✅
- No ENCRYPTION_KEY (BYOK disabled)
- No AI API keys (AI features return 503)
- No R2 credentials (image upload disabled)

**Minimal working setup:**
```
DATABASE_URL=<auto-set>
PORT=<auto-set>
NODE_ENV=production
ANTHROPIC_API_KEY=sk-ant-...  (optional but recommended)
```

**Full featured setup:**
```
DATABASE_URL=<auto-set>
PORT=<auto-set>
NODE_ENV=production
ENCRYPTION_KEY=<64-char-hex>
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=vertigo-control-images
R2_ACCOUNT_ID=...
R2_PUBLIC_URL=https://...
```

---

## Testing After Deploy

Check deployment logs on Railway:
- ✅ "Server running on port 3000"
- ✅ "WebSocket server initialized"
- ⚠️ "Warning: ENCRYPTION_KEY not set" (expected if not configured)
- ⚠️ "Warning: Image storage not configured" (expected if R2 not set)

**Health check:**
```
curl https://your-app.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-10-08T...",
  "uptime": 123.45
}
```

---

## What's Working Now

✅ Database (all migrations applied)
✅ Authentication API
✅ Projects, Controllers, Devices, Scenes
✅ WebSocket server (for NUC connections)
✅ AI API (if you add API keys)
✅ GUI Management (deploy/sync)

⚠️ BYOK (needs ENCRYPTION_KEY)
⚠️ Image uploads (needs R2)

---

## Next Steps

1. **Verify deployment:** Check Railway logs show "Server running"
2. **Add Anthropic key:** For AI features (recommended)
3. **Add ENCRYPTION_KEY:** For BYOK support (optional)
4. **Setup R2:** For image uploads (optional)

The server is now production-ready with just the database! 🎉
