# Deploying Frontend to Railway

## Overview

The Vertigo Control frontend can be deployed to Railway as a separate service from the backend API.

## Architecture

```
[Frontend Dashboard]          [Backend API]
railway.app/dashboard    →    railway.app/api
(React/Vite Static)          (Node.js/Express)
```

## Step-by-Step Deployment

### Option 1: Deploy from GitHub (Recommended)

1. **Push frontend to GitHub** (if not already):
```bash
git add frontend/
git commit -m "Add frontend dashboard"
git push origin main
```

2. **Create New Railway Service**:
   - Go to Railway dashboard
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `Vertigo_Control` repository
   - Railway will auto-detect the Vite project

3. **Configure Root Directory**:
   - In Railway service settings
   - Set "Root Directory" to `frontend`
   - Railway will automatically detect `package.json` and build

4. **Set Environment Variables**:
   - Add environment variable in Railway:
   ```
   VITE_API_URL=https://your-backend-api.railway.app
   ```
   - Replace `your-backend-api.railway.app` with your actual backend URL

5. **Deploy**:
   - Railway will automatically:
     - Run `npm install`
     - Run `npm run build`
     - Serve the `dist/` folder
   - Get your frontend URL: `https://your-frontend.railway.app`

### Option 2: Deploy with Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Navigate to frontend
cd frontend

# Link to Railway project
railway link

# Deploy
railway up
```

## Configuration Details

### Build Configuration

Railway auto-detects Vite and uses:
```json
{
  "build": "npm run build",
  "start": "npm run preview"
}
```

### Environment Variables (Railway Dashboard)

Required:
```
VITE_API_URL=https://vertigo-control-api.railway.app
NODE_ENV=production
```

### Backend CORS Configuration

**IMPORTANT**: Update your backend to allow requests from the frontend domain:

In `src/server.js`, update CORS configuration:
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',  // Local development
    'https://your-frontend.railway.app',  // Production frontend
  ],
  credentials: true
}));
```

## Deployment Checklist

- [ ] Frontend pushed to GitHub
- [ ] New Railway service created
- [ ] Root directory set to `frontend`
- [ ] Environment variable `VITE_API_URL` configured
- [ ] Backend CORS updated with frontend URL
- [ ] Deployment successful
- [ ] Frontend can connect to backend API
- [ ] Test login/register functionality
- [ ] Test AI chat interface

## Monitoring & Logs

View logs in Railway dashboard:
- Build logs: See build process
- Runtime logs: See server errors
- Metrics: Monitor resource usage

## Custom Domain (Optional)

1. Go to Railway service settings
2. Click "Settings" → "Domains"
3. Add custom domain: `dashboard.yourcompany.com`
4. Update DNS records as instructed
5. Update `VITE_API_URL` if needed

## Troubleshooting

### Build Fails

**Issue**: `npm run build` fails
**Solution**: Check build logs, ensure all dependencies in package.json

### API Connection Error

**Issue**: Frontend can't reach backend
**Solution**: 
1. Verify `VITE_API_URL` is correct
2. Check backend CORS settings
3. Ensure backend is running

### 404 on Routes

**Issue**: Refresh on `/dashboard` returns 404
**Solution**: Vite serves SPAs correctly by default, but if needed add:

Create `vercel.json` or `_redirects` file:
```json
{
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### Environment Variables Not Working

**Issue**: `VITE_API_URL` undefined
**Solution**:
1. Ensure variable starts with `VITE_`
2. Rebuild after adding variable
3. Check Railway deployment logs

## Performance Optimization

Railway automatically:
- ✅ Minifies JavaScript
- ✅ Optimizes CSS
- ✅ Compresses assets
- ✅ Serves via CDN

## Cost Estimate

- **Free Tier**: Suitable for development
- **Hobby Plan** ($5/month): Good for small production use
- **Pro Plan** ($20/month): For production with high traffic

## Updating the Deployment

Push changes to GitHub:
```bash
git add .
git commit -m "Update frontend"
git push origin main
```

Railway automatically redeploys on push.

## Alternative: Deploy Frontend Separately

You can also deploy the frontend to:
- **Vercel** (recommended for static sites)
- **Netlify** (similar to Vercel)
- **Cloudflare Pages**

All support Vite and automatic deployments from GitHub.

## Security Notes

1. **Never commit `.env`** to git (it's in .gitignore)
2. **Use environment variables** for all config
3. **Enable HTTPS** (Railway does this automatically)
4. **Set proper CORS** on backend

## Support

For Railway-specific issues:
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
