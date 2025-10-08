const crypto = require('crypto');

/**
 * APIKeyEncryption
 * Handles encryption/decryption of BYOK (Bring Your Own Key) API keys
 * Uses AES-256-GCM for authenticated encryption
 */
class APIKeyEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.enabled = false;

    // Get encryption key from environment
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
      console.warn('Warning: ENCRYPTION_KEY not set. BYOK feature disabled.');
      return;
    }

    // Convert hex string to buffer (must be 32 bytes for AES-256)
    this.key = Buffer.from(keyHex, 'hex');

    if (this.key.length !== 32) {
      console.warn('Warning: ENCRYPTION_KEY invalid length. BYOK feature disabled.');
      return;
    }

    this.enabled = true;
  }

  /**
   * Encrypt a plaintext API key
   * @param {string} plaintext - API key to encrypt
   * @returns {string} - Encrypted string in format: iv:authTag:encrypted
   */
  encrypt(plaintext) {
    if (!this.enabled) {
      throw new Error('Encryption not available: ENCRYPTION_KEY not configured');
    }

    // Generate random IV (initialization vector)
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag (ensures data integrity)
    const authTag = cipher.getAuthTag();

    // Return combined string: iv:authTag:encrypted
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt an encrypted API key
   * @param {string} ciphertext - Encrypted string from encrypt()
   * @returns {string} - Decrypted API key
   */
  decrypt(ciphertext) {
    if (!this.enabled) {
      throw new Error('Decryption not available: ENCRYPTION_KEY not configured');
    }

    try {
      // Split the combined string
      const parts = ciphertext.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  /**
   * Check if encryption is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Generate a random encryption key (for initial setup)
   * @returns {string} - 64-character hex string (32 bytes)
   */
  static generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Mask an API key for display (show first 8 chars, hide rest)
   * @param {string} apiKey - API key to mask
   * @returns {string} - Masked key (e.g., "sk-ant-a...")
   */
  static maskKey(apiKey) {
    if (!apiKey || apiKey.length < 12) {
      return '***';
    }
    return apiKey.substring(0, 8) + '...';
  }
}

module.exports = new APIKeyEncryption();
