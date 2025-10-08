const pool = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * GUIFileManager
 * Manages file-based GUI storage with draft/deployed states and versioning
 *
 * File States:
 * - DRAFT: AI's workspace (safe experimentation)
 * - DEPLOYED: Stable version (ready to sync to NUC)
 *
 * Workflow:
 * 1. AI modifies draft files
 * 2. User reviews in preview
 * 3. User clicks "Deploy" → draft → deployed + version snapshot
 * 4. User clicks "Sync" → deployed → NUC via WebSocket
 */
class GUIFileManager {
  /**
   * Read all draft files for a controller
   * @param {string} controllerId - Controller UUID
   * @returns {Object} - { 'gui/config.json': {...}, 'gui/pages/main.json': {...} }
   */
  async readDraftFiles(controllerId) {
    const result = await pool.query(
      `SELECT file_path, content FROM gui_files
       WHERE controller_id = $1 AND state = 'draft'
       ORDER BY file_path`,
      [controllerId]
    );

    const files = {};
    for (const row of result.rows) {
      files[row.file_path] = row.content;
    }

    return files;
  }

  /**
   * Read all deployed files for a controller
   * @param {string} controllerId - Controller UUID
   * @returns {Object} - Files object
   */
  async readDeployedFiles(controllerId) {
    const result = await pool.query(
      `SELECT file_path, content FROM gui_files
       WHERE controller_id = $1 AND state = 'deployed'
       ORDER BY file_path`,
      [controllerId]
    );

    const files = {};
    for (const row of result.rows) {
      files[row.file_path] = row.content;
    }

    return files;
  }

  /**
   * Read a single file (draft or deployed)
   * @param {string} controllerId - Controller UUID
   * @param {string} filePath - File path (e.g., 'gui/pages/main.json')
   * @param {string} state - 'draft' or 'deployed'
   * @returns {Object|null} - File content or null if not found
   */
  async readFile(controllerId, filePath, state = 'draft') {
    const result = await pool.query(
      `SELECT content FROM gui_files
       WHERE controller_id = $1 AND file_path = $2 AND state = $3`,
      [controllerId, filePath, state]
    );

    return result.rows.length > 0 ? result.rows[0].content : null;
  }

  /**
   * Write a draft file (AI modifies here)
   * @param {string} controllerId - Controller UUID
   * @param {string} filePath - File path
   * @param {Object} content - JSON content
   * @param {string} modifiedBy - Who made the change (e.g., 'ai', 'user', userId)
   * @returns {Object} - Created/updated file info
   */
  async writeDraftFile(controllerId, filePath, content, modifiedBy = 'ai') {
    // Validate file path (prevent directory traversal)
    if (filePath.includes('..') || filePath.startsWith('/')) {
      throw new Error('Invalid file path');
    }

    // Validate content is valid JSON
    if (typeof content !== 'object' || content === null) {
      throw new Error('Content must be a valid JSON object');
    }

    const result = await pool.query(
      `INSERT INTO gui_files (controller_id, file_path, state, content, modified_by)
       VALUES ($1, $2, 'draft', $3, $4)
       ON CONFLICT (controller_id, file_path, state)
       DO UPDATE SET content = $3, modified_at = NOW(), modified_by = $4
       RETURNING id, file_path, state, modified_at, modified_by`,
      [controllerId, filePath, JSON.stringify(content), modifiedBy]
    );

    return result.rows[0];
  }

  /**
   * Delete a draft file
   * @param {string} controllerId - Controller UUID
   * @param {string} filePath - File path
   * @returns {boolean} - True if deleted
   */
  async deleteDraftFile(controllerId, filePath) {
    const result = await pool.query(
      `DELETE FROM gui_files
       WHERE controller_id = $1 AND file_path = $2 AND state = 'draft'`,
      [controllerId, filePath]
    );

    return result.rowCount > 0;
  }

  /**
   * Deploy draft files to deployed state
   * Creates a version snapshot and copies all draft files to deployed
   *
   * @param {string} controllerId - Controller UUID
   * @param {string} userId - User who triggered deploy
   * @param {string} commitMessage - Description of changes
   * @returns {Object} - { version, filesDeployed }
   */
  async deployDraftFiles(controllerId, userId, commitMessage = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get all draft files
      const draftFiles = await this.readDraftFiles(controllerId);

      if (Object.keys(draftFiles).length === 0) {
        throw new Error('No draft files to deploy');
      }

      // Get next version number
      const versionResult = await client.query(
        `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
         FROM gui_file_versions
         WHERE controller_id = $1`,
        [controllerId]
      );
      const version = versionResult.rows[0].next_version;

      // Copy each draft file to deployed state
      for (const [filePath, content] of Object.entries(draftFiles)) {
        await client.query(
          `INSERT INTO gui_files (controller_id, file_path, state, content, modified_by)
           VALUES ($1, $2, 'deployed', $3, $4)
           ON CONFLICT (controller_id, file_path, state)
           DO UPDATE SET content = $3, modified_at = NOW(), modified_by = $4`,
          [controllerId, filePath, JSON.stringify(content), userId]
        );
      }

      // Create version snapshot
      await client.query(
        `INSERT INTO gui_file_versions
         (controller_id, version_number, state, files, commit_message, created_by)
         VALUES ($1, $2, 'deployed', $3, $4, $5)`,
        [controllerId, version, JSON.stringify(draftFiles), commitMessage, userId]
      );

      await client.query('COMMIT');

      console.log(`✓ Deployed version ${version} for controller ${controllerId}`);

      return {
        version,
        filesDeployed: Object.keys(draftFiles).length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Discard draft changes and revert to deployed version
   * @param {string} controllerId - Controller UUID
   * @returns {Object} - { filesReverted }
   */
  async discardDraftChanges(controllerId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get deployed files
      const deployedFiles = await this.readDeployedFiles(controllerId);

      // Delete all draft files
      await client.query(
        `DELETE FROM gui_files WHERE controller_id = $1 AND state = 'draft'`,
        [controllerId]
      );

      // Copy deployed files to draft
      for (const [filePath, content] of Object.entries(deployedFiles)) {
        await client.query(
          `INSERT INTO gui_files (controller_id, file_path, state, content, modified_by)
           VALUES ($1, $2, 'draft', $3, 'system')`,
          [controllerId, filePath, JSON.stringify(content)]
        );
      }

      await client.query('COMMIT');

      return {
        filesReverted: Object.keys(deployedFiles).length
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback to a previous version
   * @param {string} controllerId - Controller UUID
   * @param {number} targetVersion - Version number to rollback to
   * @returns {Object} - { version, filesRestored }
   */
  async rollbackToVersion(controllerId, targetVersion) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get version snapshot
      const versionResult = await client.query(
        `SELECT files FROM gui_file_versions
         WHERE controller_id = $1 AND version_number = $2`,
        [controllerId, targetVersion]
      );

      if (versionResult.rows.length === 0) {
        throw new Error(`Version ${targetVersion} not found`);
      }

      const files = versionResult.rows[0].files;

      // Delete current deployed files
      await client.query(
        `DELETE FROM gui_files WHERE controller_id = $1 AND state = 'deployed'`,
        [controllerId]
      );

      // Restore files from snapshot
      for (const [filePath, content] of Object.entries(files)) {
        await client.query(
          `INSERT INTO gui_files (controller_id, file_path, state, content, modified_by)
           VALUES ($1, $2, 'deployed', $3, 'system')`,
          [controllerId, filePath, JSON.stringify(content)]
        );
      }

      // Also update draft to match (so user sees rolled back version)
      await client.query(
        `DELETE FROM gui_files WHERE controller_id = $1 AND state = 'draft'`,
        [controllerId]
      );

      for (const [filePath, content] of Object.entries(files)) {
        await client.query(
          `INSERT INTO gui_files (controller_id, file_path, state, content, modified_by)
           VALUES ($1, $2, 'draft', $3, 'system')`,
          [controllerId, filePath, JSON.stringify(content)]
        );
      }

      await client.query('COMMIT');

      return {
        version: targetVersion,
        filesRestored: Object.keys(files).length
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get version history for a controller
   * @param {string} controllerId - Controller UUID
   * @param {number} limit - Max versions to return
   * @returns {Array} - Version history
   */
  async getVersionHistory(controllerId, limit = 20) {
    const result = await pool.query(
      `SELECT version_number, commit_message, created_at, created_by,
              (SELECT COUNT(*) FROM jsonb_object_keys(files)) as file_count
       FROM gui_file_versions
       WHERE controller_id = $1
       ORDER BY version_number DESC
       LIMIT $2`,
      [controllerId, limit]
    );

    return result.rows;
  }

  /**
   * Get current status (draft vs deployed vs live versions)
   * @param {string} controllerId - Controller UUID
   * @returns {Object} - Status info
   */
  async getStatus(controllerId) {
    // Get latest deployed version
    const deployedResult = await pool.query(
      `SELECT MAX(version_number) as version
       FROM gui_file_versions
       WHERE controller_id = $1 AND state = 'deployed'`,
      [controllerId]
    );

    // Get latest live version (running on NUC)
    const liveResult = await pool.query(
      `SELECT MAX(version_number) as version
       FROM gui_file_versions
       WHERE controller_id = $1 AND state = 'live'`,
      [controllerId]
    );

    // Count draft files
    const draftResult = await pool.query(
      `SELECT COUNT(*) as count FROM gui_files
       WHERE controller_id = $1 AND state = 'draft'`,
      [controllerId]
    );

    // Count deployed files
    const deployedFilesResult = await pool.query(
      `SELECT COUNT(*) as count FROM gui_files
       WHERE controller_id = $1 AND state = 'deployed'`,
      [controllerId]
    );

    const deployedVersion = deployedResult.rows[0].version;
    const liveVersion = liveResult.rows[0].version;

    return {
      draftFileCount: parseInt(draftResult.rows[0].count),
      deployedFileCount: parseInt(deployedFilesResult.rows[0].count),
      deployedVersion: deployedVersion,
      liveVersion: liveVersion,
      hasUndeployedChanges: draftResult.rows[0].count !== deployedFilesResult.rows[0].count,
      needsSync: deployedVersion > liveVersion
    };
  }
}

module.exports = new GUIFileManager();
