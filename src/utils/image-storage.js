const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const pool = require('../db/connection');

/**
 * ImageStorage
 * Handles image uploads to Cloudflare R2 (S3-compatible storage)
 */
class ImageStorage {
  constructor() {
    // Check for required environment variables
    const requiredVars = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_ACCOUNT_ID'];
    const missing = requiredVars.filter(v => !process.env[v]);

    if (missing.length > 0) {
      console.warn(`Warning: Image storage not configured. Missing: ${missing.join(', ')}`);
      this.enabled = false;
      return;
    }

    this.enabled = true;

    // Initialize S3 client for Cloudflare R2
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });

    this.bucketName = process.env.R2_BUCKET_NAME;
    this.publicUrl = process.env.R2_PUBLIC_URL || `https://${this.bucketName}.r2.dev`;
  }

  /**
   * Upload an image to R2
   *
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} originalFilename - Original filename
   * @param {string} mimeType - MIME type (e.g., 'image/png')
   * @param {string} integratorId - Integrator ID (for multi-tenancy)
   * @returns {Promise<Object>} - { filename, url, size }
   */
  async uploadImage(fileBuffer, originalFilename, mimeType, integratorId) {
    if (!this.enabled) {
      throw new Error('Image storage not configured');
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > MAX_SIZE) {
      throw new Error(`File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB`);
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    // Generate unique filename
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
    const ext = originalFilename.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    const filename = `${integratorId}/${timestamp}-${hash}.${ext}`;

    try {
      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
        Body: fileBuffer,
        ContentType: mimeType,
        Metadata: {
          'integrator-id': integratorId,
          'original-filename': originalFilename
        }
      });

      await this.client.send(command);

      // Generate public URL
      const url = `${this.publicUrl}/${filename}`;

      // Save metadata to database
      await pool.query(
        `INSERT INTO images (integrator_id, filename, storage_url, mime_type, size_bytes)
         VALUES ($1, $2, $3, $4, $5)`,
        [integratorId, filename, url, mimeType, fileBuffer.length]
      );

      console.log(`✓ Image uploaded: ${filename} (${this.formatBytes(fileBuffer.length)})`);

      return {
        filename,
        url,
        size: fileBuffer.length
      };

    } catch (error) {
      console.error('Image upload failed:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Delete an image from R2
   *
   * @param {string} filename - Filename in R2
   * @param {string} integratorId - Integrator ID (for security check)
   * @returns {Promise<boolean>} - True if deleted
   */
  async deleteImage(filename, integratorId) {
    if (!this.enabled) {
      throw new Error('Image storage not configured');
    }

    try {
      // Verify ownership
      const result = await pool.query(
        `SELECT id FROM images WHERE filename = $1 AND integrator_id = $2`,
        [filename, integratorId]
      );

      if (result.rows.length === 0) {
        throw new Error('Image not found or access denied');
      }

      // Delete from R2
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filename
      });

      await this.client.send(command);

      // Delete from database
      await pool.query(
        `DELETE FROM images WHERE filename = $1 AND integrator_id = $2`,
        [filename, integratorId]
      );

      console.log(`✓ Image deleted: ${filename}`);

      return true;

    } catch (error) {
      console.error('Image deletion failed:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Get list of images for an integrator
   *
   * @param {string} integratorId - Integrator ID
   * @param {number} limit - Max images to return
   * @returns {Promise<Array>} - Array of image metadata
   */
  async listImages(integratorId, limit = 100) {
    const result = await pool.query(
      `SELECT id, filename, storage_url, mime_type, size_bytes, created_at
       FROM images
       WHERE integrator_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [integratorId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      filename: row.filename,
      url: row.storage_url,
      mimeType: row.mime_type,
      size: row.size_bytes,
      sizeFormatted: this.formatBytes(row.size_bytes),
      createdAt: row.created_at
    }));
  }

  /**
   * Get signed URL for temporary access (if R2 bucket is private)
   *
   * @param {string} filename - Filename in R2
   * @param {number} expiresIn - Seconds until expiration
   * @returns {Promise<string>} - Signed URL
   */
  async getSignedUrl(filename, expiresIn = 3600) {
    if (!this.enabled) {
      throw new Error('Image storage not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filename
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    return url;
  }

  /**
   * Format bytes to human-readable string
   *
   * @param {number} bytes - File size in bytes
   * @returns {string} - Formatted string (e.g., '1.5 MB')
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if image storage is enabled
   *
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }
}

module.exports = new ImageStorage();
