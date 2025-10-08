const pool = require('../db/connection');
const fileManager = require('./file-manager');

/**
 * AIContextBuilder
 * Builds comprehensive context for AI providers
 * Includes draft files, devices, controls, scenes, and system info
 */
class AIContextBuilder {
  /**
   * Build full context for a controller
   *
   * @param {string} controllerId - Controller UUID
   * @returns {Promise<Object>} - Complete context object
   */
  async buildContext(controllerId) {
    // Get draft files
    const draftFiles = await fileManager.readDraftFiles(controllerId);

    // Get controller info
    const controllerInfo = await this.getControllerInfo(controllerId);

    // Get devices
    const devices = await this.getDevices(controllerId);

    // Get controls (with device context)
    const controls = await this.getControls(controllerId);

    // Get scenes
    const scenes = await this.getScenes(controllerId);

    // Build structured context
    return {
      system: {
        controller: controllerInfo.name,
        project: controllerInfo.projectName,
        integrator: controllerInfo.integratorName,
        controllerId: controllerId
      },
      draftFiles,
      devices,
      controls,
      scenes,
      summary: {
        fileCount: Object.keys(draftFiles).length,
        deviceCount: devices.length,
        controlCount: controls.length,
        sceneCount: scenes.length
      }
    };
  }

  /**
   * Get controller and related info
   */
  async getControllerInfo(controllerId) {
    const result = await pool.query(
      `SELECT
         c.id,
         c.name as controller_name,
         p.name as project_name,
         i.name as integrator_name
       FROM controllers c
       JOIN projects p ON c.project_id = p.id
       JOIN integrators i ON p.integrator_id = i.id
       WHERE c.id = $1`,
      [controllerId]
    );

    if (result.rows.length === 0) {
      throw new Error('Controller not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.controller_name,
      projectName: row.project_name,
      integratorName: row.integrator_name
    };
  }

  /**
   * Get all devices for controller
   */
  async getDevices(controllerId) {
    const result = await pool.query(
      `SELECT
         id,
         device_id,
         name,
         type,
         connection_config,
         status
       FROM devices
       WHERE controller_id = $1
       ORDER BY name`,
      [controllerId]
    );

    return result.rows.map(row => ({
      id: row.id,
      deviceId: row.device_id,
      name: row.name,
      type: row.type,
      connectionConfig: row.connection_config,
      status: row.status
    }));
  }

  /**
   * Get all controls with device info
   */
  async getControls(controllerId) {
    const result = await pool.query(
      `SELECT
         dc.id,
         dc.control_id,
         dc.logical_name,
         dc.control_type,
         dc.block_id,
         dc.parameters,
         d.device_id,
         d.name as device_name,
         d.type as device_type
       FROM device_controls dc
       JOIN devices d ON dc.device_id = d.id
       WHERE d.controller_id = $1
       ORDER BY d.name, dc.logical_name`,
      [controllerId]
    );

    return result.rows.map(row => ({
      id: row.id,
      controlId: row.control_id,
      logicalName: row.logical_name,
      controlType: row.control_type,
      blockId: row.block_id,
      parameters: row.parameters,
      device: {
        deviceId: row.device_id,
        name: row.device_name,
        type: row.device_type
      }
    }));
  }

  /**
   * Get all scenes
   */
  async getScenes(controllerId) {
    const result = await pool.query(
      `SELECT
         id,
         scene_id,
         name,
         description,
         steps,
         continue_on_error
       FROM scenes
       WHERE controller_id = $1
       ORDER BY name`,
      [controllerId]
    );

    return result.rows.map(row => ({
      id: row.id,
      sceneId: row.scene_id,
      name: row.name,
      description: row.description,
      steps: row.steps,
      continueOnError: row.continue_on_error
    }));
  }

  /**
   * Build lightweight context (for token optimization)
   * Only includes essential info
   */
  async buildLightContext(controllerId) {
    const controls = await this.getControls(controllerId);
    const scenes = await this.getScenes(controllerId);

    return {
      availableControls: controls.map(c => ({
        deviceId: c.device.deviceId,
        controlId: c.controlId,
        name: c.logicalName,
        type: c.controlType
      })),
      availableScenes: scenes.map(s => ({
        sceneId: s.sceneId,
        name: s.name
      }))
    };
  }

  /**
   * Format context for AI consumption
   * Converts to clean, readable format
   */
  formatForAI(context) {
    return {
      system_info: context.system,
      current_files: this.formatFiles(context.draftFiles),
      available_devices: this.formatDevices(context.devices),
      available_controls: this.formatControls(context.controls),
      existing_scenes: this.formatScenes(context.scenes)
    };
  }

  formatFiles(draftFiles) {
    const formatted = {};
    for (const [path, content] of Object.entries(draftFiles)) {
      formatted[path] = content;
    }
    return formatted;
  }

  formatDevices(devices) {
    return devices.map(d => ({
      device_id: d.deviceId,
      name: d.name,
      type: d.type,
      status: d.status
    }));
  }

  formatControls(controls) {
    return controls.map(c => ({
      device: c.device.deviceId,
      control_id: c.controlId,
      logical_name: c.logicalName,
      type: c.controlType,
      usage_example: this.getControlUsageExample(c)
    }));
  }

  formatScenes(scenes) {
    return scenes.map(s => ({
      scene_id: s.sceneId,
      name: s.name,
      description: s.description,
      step_count: s.steps.length
    }));
  }

  /**
   * Get usage example for a control (for AI guidance)
   */
  getControlUsageExample(control) {
    const examples = {
      gain: `{ "device": "${control.device.deviceId}", "control_id": "${control.controlId}" }`,
      mute: `{ "device": "${control.device.deviceId}", "control_id": "${control.controlId}" }`,
      phase: `{ "device": "${control.device.deviceId}", "control_id": "${control.controlId}" }`,
      matrix: `{ "device": "${control.device.deviceId}", "control_id": "${control.controlId}" }`
    };

    return examples[control.controlType] || `{ "device": "${control.device.deviceId}", "control_id": "${control.controlId}" }`;
  }
}

module.exports = new AIContextBuilder();
