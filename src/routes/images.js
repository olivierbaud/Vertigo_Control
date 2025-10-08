const express = require('express');
const multer = require('multer');
const imageStorage = require('../utils/image-storage');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allow only images
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

/**
 * POST /api/images/upload
 * Upload an image to Cloudflare R2
 */
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { integrator_id } = req.user;

    // Check if image storage is enabled
    if (!imageStorage.isEnabled()) {
      return res.status(503).json({
        error: 'Image storage not configured',
        message: 'Cloudflare R2 credentials are missing'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide an image file'
      });
    }

    // Upload to R2
    const result = await imageStorage.uploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      integrator_id
    );

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: {
        filename: result.filename,
        url: result.url,
        size: result.size,
        sizeFormatted: imageStorage.formatBytes(result.size)
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);

    if (error.message.includes('File too large')) {
      return res.status(413).json({ error: error.message });
    }

    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Image upload failed' });
  }
});

/**
 * GET /api/images
 * List all images for the authenticated integrator
 */
router.get('/', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const limit = parseInt(req.query.limit) || 100;

    const images = await imageStorage.listImages(integrator_id, limit);

    res.json({ images });

  } catch (error) {
    console.error('List images error:', error);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

/**
 * DELETE /api/images/:integratorPath/:filename
 * Delete an image (format: integratorId/timestamp-hash.ext)
 */
router.delete('/:integratorPath/:filename', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    // Reconstruct full filename path
    const filename = `${req.params.integratorPath}/${req.params.filename}`;

    if (!imageStorage.isEnabled()) {
      return res.status(503).json({
        error: 'Image storage not configured'
      });
    }

    await imageStorage.deleteImage(filename, integrator_id);

    res.json({ message: 'Image deleted successfully' });

  } catch (error) {
    console.error('Delete image error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to delete image' });
  }
});

/**
 * GET /api/images/status
 * Check if image storage is configured
 */
router.get('/status', (req, res) => {
  res.json({
    enabled: imageStorage.isEnabled(),
    message: imageStorage.isEnabled()
      ? 'Image storage is configured and ready'
      : 'Image storage not configured (missing R2 credentials)'
  });
});

module.exports = router;
