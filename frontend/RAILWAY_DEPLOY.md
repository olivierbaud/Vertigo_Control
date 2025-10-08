# Deploy Frontend to Railway - Quick Guide

## Step 1: Push Frontend Config to GitHub

```bash
git add frontend/
git commit -m "Add Railway deployment config for frontend"
git push origin main
```

## Step 2: Create New Railway Service

1. Go to https://railway.app/dashboard
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your **Vertigo_Control** repository
4. Railway will create a new service

## Step 3: Configure the Service

### A. Set Root Directory
1. Click on your new service
2. Go to **Settings** → **Source**
3. Set **Root Directory** to: `frontend`
4. Click **Save**

### B. Add Environment Variables
1. Go to **Variables** tab
2. Click **"New Variable"**
3. Add these variables:

```
VITE_API_URL=https://backend-production-baec.up.railway.app
NODE_ENV=production
```

### C. Generate Public Domain
1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. You'll get a URL like: `https://vertigo-control-frontend-production.up.railway.app`
4. **Copy this URL!** You'll need it for the backend CORS configuration.

## Step 4: Update Backend CORS

Once you have your frontend URL, update the backend:

1. Edit `src/server.js` line 28
2. Replace the placeholder with your actual frontend URL
3. Example:
```javascript
const allowedOrigins = [
  'http://localhost:5173',  // Local Vite dev server
  'http://localhost:3001',  // Alternative local port
  'https://vertigo-control-frontend-production.up.railway.app',  // YOUR URL HERE
  process.env.FRONTEND_URL,  // Production frontend URL from env
].filter(Boolean);
```

4. Commit and push:
```bash
git add src/server.js
git commit -m "Update CORS for Railway frontend"
git push origin main
```

## Step 5: Deploy!

Railway will automatically:
- Detect the `nixpacks.toml` config
- Run `npm ci` to install dependencies
- Run `npm run build` to build the app
- Serve the `dist/` folder with `serve` (handles SPA routing)

## Step 6: Test

Visit your frontend URL. You should see:
- Login/Register pages working
- Able to connect to the backend API
- No CORS errors in browser console

## Troubleshooting

### Build fails
- Check Railway build logs
- Verify `package.json` has all dependencies
- Check `nixpacks.toml` syntax

### CORS errors
- Verify backend CORS has your frontend URL
- Check backend is deployed with updated CORS
- Test backend directly: `curl https://backend-production-baec.up.railway.app/health`

### Routes return 404 on refresh
- Verify `serve` is running with `-s` flag (SPA mode)
- Check `nixpacks.toml` start command

### Can't connect to API
- Check `VITE_API_URL` environment variable in Railway
- Verify it points to: `https://backend-production-baec.up.railway.app`
- Check browser Network tab for actual API requests

## What's Next?

After successful deployment:
1. ✅ Frontend accessible from cloud
2. ✅ Connects to Railway backend
3. ✅ Login/Register working
4. ✅ Can manage projects and controllers
5. ✅ AI chat interface accessible

Your cloud dashboard is now live! 🎉
