# Image Storage Guide - Cloudflare R2 Integration

**Last Updated:** October 10, 2025
**Storage Provider:** Cloudflare R2 (S3-Compatible)
**Implementation:** [src/utils/image-storage.js](src/utils/image-storage.js)

---

## 📦 Overview

Vertigo Control uses **Cloudflare R2** for image storage, providing:
- ✅ **Zero egress fees** (unlike AWS S3)
- ✅ **S3-compatible API** (easy migration)
- ✅ **Global CDN** distribution
- ✅ **10MB file size limit** per upload
- ✅ **Hash-based deduplication** (saves storage)
- ✅ **Multi-tenant isolation** (per-integrator folders)
- ✅ **Signed URLs** for secure access

---

## 🏗️ Architecture

### Storage Structure

```
vertigo-control-images/
├── integrator-uuid-1/
│   ├── hash1.png
│   ├── hash2.jpg
│   └── hash3.webp
├── integrator-uuid-2/
│   ├── hash4.png
│   └── hash5.jpg
└── integrator-uuid-3/
    └── hash6.gif
```

**Key Features:**
- Each integrator has a dedicated folder (UUID)
- Filenames are SHA-256 hashes (prevents collisions)
- Original filename extension preserved
- Duplicate files automatically deduplicated by hash

---

## 🔧 Setup Instructions

### 1. Create Cloudflare R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage**
3. Click **Create bucket**
4. Name: `vertigo-control-images` (or your choice)
5. Click **Create bucket**

### 2. Generate R2 API Tokens

1. In R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. **Token name:** `vertigo-control-backend`
4. **Permissions:**
   - ✅ Object Read & Write
   - ✅ Bucket Read
5. **Bucket scope:** Select your bucket
6. Click **Create API Token**
7. **Save these values:**
   - Access Key ID
   - Secret Access Key
   - Bucket name
   - Account ID

### 3. Configure Environment Variables

Add to Railway (or `.env` for local):

```bash
# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=vertigo-control-images
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_PUBLIC_URL=https://your-bucket-url.r2.dev  # Optional: Custom domain
```

**Get Account ID:**
- Found in R2 dashboard URL: `dash.cloudflare.com/{account-id}/r2`

**Public URL Options:**
- Default: `https://{bucket}.{account-id}.r2.cloudflarestorage.com`
- Custom domain: `https://images.yourdomain.com` (requires setup)

### 4. Verify Connection

```bash
# Test upload via API
curl -X POST https://your-app.railway.app/api/images/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@test-image.png"
```

---

## 📡 API Endpoints

### Upload Image

**Endpoint:** `POST /api/images/upload`

**Authentication:** Required (JWT)

**Request:**
```http
POST /api/images/upload
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

image: <file>
```

**Response (Success):**
```json
{
  "success": true,
  "image": {
    "id": "uuid",
    "filename": "original-name.png",
    "storedAs": "abc123def456...789.png",
    "url": "https://your-bucket.r2.dev/integrator-uuid/abc123def456...789.png",
    "size": 245678,
    "mimeType": "image/png",
    "hash": "abc123def456...",
    "uploadedAt": "2025-10-10T12:00:00.000Z"
  }
}
```

**Response (Error):**
```json
{
  "error": "File size exceeds 10MB limit"
}
```

**Supported Formats:**
- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/gif` (.gif)
- `image/webp` (.webp)

**Size Limit:** 10MB per file

---

### List Images

**Endpoint:** `GET /api/images`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": "uuid",
      "filename": "logo.png",
      "url": "https://...",
      "size": 123456,
      "uploadedAt": "2025-10-10T12:00:00.000Z"
    },
    ...
  ]
}
```

---

### Delete Image

**Endpoint:** `DELETE /api/images/:integratorPath/:filename`

**Authentication:** Required (JWT)

**Example:**
```http
DELETE /api/images/integrator-uuid/abc123.png
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

**Security:** Users can only delete their own images (multi-tenant isolation)

---

## 💻 Usage Examples

### Frontend (JavaScript/React)

```javascript
// Upload image
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/images/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json();
  console.log('Image URL:', data.image.url);
  return data.image;
}

// List images
async function listImages() {
  const response = await fetch('/api/images', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  return data.images;
}

// Delete image
async function deleteImage(integratorPath, filename) {
  const response = await fetch(`/api/images/${integratorPath}/${filename}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}
```

### React Component Example

```jsx
import { useState } from 'react';

function ImageUploader() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size
    if (file.size > 10 * 1024 * 1024) {
      alert('File must be less than 10MB');
      return;
    }

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setImageUrl(data.image.url);
        alert('Image uploaded successfully!');
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (error) {
      alert('Upload error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {imageUrl && (
        <div>
          <p>Upload successful!</p>
          <img src={imageUrl} alt="Uploaded" style={{ maxWidth: '300px' }} />
        </div>
      )}
    </div>
  );
}
```

---

## 🔐 Security Features

### 1. Multi-Tenant Isolation

**Implementation:**
- Each integrator's images stored in separate folder
- Folder name is integrator UUID (from JWT)
- Users cannot access other integrators' images

```javascript
// Automatic path construction
const integratorPath = req.integratorId; // From JWT
const key = `${integratorPath}/${hashedFilename}`;
```

### 2. Hash-Based Deduplication

**How it works:**
1. Calculate SHA-256 hash of file contents
2. Use hash as filename (with original extension)
3. If same file uploaded twice, overwrites (no duplicates)

```javascript
const hash = crypto.createHash('sha256')
  .update(buffer)
  .digest('hex');

const filename = `${hash}${path.extname(originalName)}`;
```

**Benefits:**
- Saves storage space
- Prevents duplicate uploads
- Consistent filenames for same content

### 3. File Validation

**Size Check:**
```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

if (buffer.length > MAX_FILE_SIZE) {
  throw new Error('File size exceeds 10MB limit');
}
```

**MIME Type Check:**
```javascript
const allowedTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

if (!allowedTypes.includes(mimeType)) {
  throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP allowed');
}
```

### 4. Signed URLs (Optional)

For private access:

```javascript
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

// Generate signed URL (expires in 1 hour)
const command = new GetObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key: imageKey
});

const signedUrl = await getSignedUrl(r2Client, command, {
  expiresIn: 3600 // 1 hour
});
```

**Use cases:**
- Private images (not publicly accessible)
- Temporary access links
- Watermarked downloads

---

## 📊 Database Schema

**Table:** `images`

```sql
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrator_id UUID NOT NULL REFERENCES integrators(id),
  filename VARCHAR(255) NOT NULL,        -- Original filename
  stored_as VARCHAR(255) NOT NULL,       -- Hash-based filename
  url TEXT NOT NULL,                     -- Full R2 URL
  size INTEGER NOT NULL,                 -- Bytes
  mime_type VARCHAR(50) NOT NULL,        -- image/png, etc.
  hash VARCHAR(64) NOT NULL,             -- SHA-256 hash
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(integrator_id, hash)            -- Prevent duplicate uploads
);

CREATE INDEX idx_images_integrator ON images(integrator_id);
CREATE INDEX idx_images_hash ON images(hash);
```

---

## 🚀 Performance Optimization

### CDN Configuration

**Enable Cloudflare CDN:**
1. Go to R2 bucket settings
2. Enable **Public access** (optional)
3. Configure custom domain with CDN
4. Set cache rules:
   - Cache-Control: `public, max-age=31536000` (1 year)
   - Images are immutable (hash-based names)

**Benefits:**
- Fast global delivery
- Reduced R2 egress
- Lower latency

### Image Optimization

**Recommended client-side:**
```javascript
// Compress before upload
import imageCompression from 'browser-image-compression';

const options = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true
};

const compressedFile = await imageCompression(file, options);
```

**Server-side (future enhancement):**
- Add Sharp library for resizing
- Generate thumbnails automatically
- Convert to WebP for smaller size

---

## 💰 Cost Analysis

### Cloudflare R2 Pricing (as of 2025)

| Feature | Price | Notes |
|---------|-------|-------|
| **Storage** | $0.015/GB/month | Very low |
| **Class A Operations** | $4.50 per million | Writes, lists |
| **Class B Operations** | $0.36 per million | Reads |
| **Egress** | **FREE** | 🎉 Zero egress fees |

### Example Costs

**Small deployment (100 images, 1GB):**
- Storage: $0.015/month
- Operations: ~$0.10/month
- **Total: ~$0.12/month**

**Medium deployment (10,000 images, 50GB):**
- Storage: $0.75/month
- Operations: ~$5/month
- **Total: ~$5.75/month**

**Large deployment (100,000 images, 500GB):**
- Storage: $7.50/month
- Operations: ~$50/month
- **Total: ~$57.50/month**

**Compare to AWS S3:**
- S3 Storage: $0.023/GB (53% more expensive)
- S3 Egress: $0.09/GB (R2 is FREE)
- **R2 is significantly cheaper for high-traffic apps**

---

## 🐛 Troubleshooting

### Error: "Access Denied"

**Cause:** Invalid R2 credentials

**Solution:**
1. Verify `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`
2. Check token permissions in R2 dashboard
3. Ensure bucket name is correct

### Error: "File size exceeds limit"

**Cause:** File > 10MB

**Solution:**
1. Compress image before upload
2. Use image optimization tools
3. Consider video for animations (not GIF)

### Error: "Invalid file type"

**Cause:** Unsupported MIME type

**Solution:**
- Only upload JPEG, PNG, GIF, or WebP
- Check file extension matches content
- Use proper file conversion tools

### Error: "Connection timeout"

**Cause:** Network or R2 issue

**Solution:**
1. Check Cloudflare status page
2. Verify R2_ACCOUNT_ID is correct
3. Test connection with AWS CLI

---

## 🔧 Advanced Configuration

### Custom Domain Setup

1. In Cloudflare dashboard, go to R2 bucket
2. Click **Settings** → **Custom Domain**
3. Enter domain: `images.yourdomain.com`
4. Add DNS record (CNAME)
5. Wait for SSL certificate provisioning
6. Update `R2_PUBLIC_URL` environment variable

**Benefits:**
- Branded URLs
- Better caching
- SSL included

### CORS Configuration

If using from different domain:

```javascript
// Add to image storage initialization
const corsConfig = {
  CORSRules: [{
    AllowedOrigins: ['https://yourdomain.com'],
    AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
    AllowedHeaders: ['*'],
    ExposeHeaders: ['ETag'],
    MaxAgeSeconds: 3600
  }]
};
```

### Lifecycle Rules

**Auto-delete old images:**

```javascript
// Example: Delete images older than 1 year
const lifecycleConfig = {
  Rules: [{
    Id: 'DeleteOldImages',
    Status: 'Enabled',
    Expiration: {
      Days: 365
    }
  }]
};
```

---

## 📚 Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS S3 SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Multer Documentation](https://github.com/expressjs/multer)
- [Image Optimization Guide](https://web.dev/fast/#optimize-your-images)

---

## 🎯 Future Enhancements

### Planned Features
- [ ] Automatic thumbnail generation
- [ ] WebP conversion
- [ ] Image cropping/resizing
- [ ] Bulk upload
- [ ] Image gallery UI component
- [ ] Usage analytics dashboard
- [ ] Image tagging and search

---

**Last Updated:** October 10, 2025
**Implementation:** [src/utils/image-storage.js](src/utils/image-storage.js)
**API Routes:** [src/routes/images.js](src/routes/images.js)
