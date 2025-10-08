const pool = require('../db/connection');

/**
 * GUIValidator
 * Validates AI-generated GUI files before deployment
 * Checks control references, file structure, and constraints
 */
class GUIValidator {
  /**
   * Validate GUI files
   *
   * @param {Object} guiFiles - Files to validate (path -> content)
   * @param {string} controllerId - Controller UUID
   * @returns {Promise<Object>} - { valid, errors, warnings }
   */
  async validate(guiFiles, controllerId) {
    const errors = [];
    const warnings = [];

    // Get available controls for validation
    const availableControls = await this.getAvailableControls(controllerId);
    const availableScenes = await this.getAvailableScenes(controllerId);

    for (const [filePath, content] of Object.entries(guiFiles)) {
      // Validate file path
      if (!this.isValidFilePath(filePath)) {
        errors.push(`Invalid file path: ${filePath}`);
        continue;
      }

      // Validate JSON structure
      if (typeof content !== 'object' || content === null) {
        errors.push(`${filePath}: Invalid JSON structure`);
        continue;
      }

      // Validate based on file type
      if (filePath.startsWith('gui/pages/')) {
        this.validatePage(filePath, content, availableControls, availableScenes, errors, warnings);
      } else if (filePath.startsWith('gui/components/')) {
        this.validateComponent(filePath, content, availableControls, errors, warnings);
      } else if (filePath.startsWith('gui/config.json')) {
        this.validateConfig(filePath, content, errors, warnings);
      } else if (filePath.startsWith('scenes/')) {
        this.validateScene(filePath, content, availableControls, errors, warnings);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a page file
   */
  validatePage(filePath, content, availableControls, availableScenes, errors, warnings) {
    // Check required fields
    if (!content.name) {
      errors.push(`${filePath}: Missing 'name' field`);
    }

    if (!content.elements || !Array.isArray(content.elements)) {
      errors.push(`${filePath}: Missing or invalid 'elements' array`);
      return;
    }

    // Validate each element
    for (let i = 0; i < content.elements.length; i++) {
      const element = content.elements[i];
      this.validateElement(filePath, element, i, availableControls, availableScenes, errors, warnings);
    }

    // Check for overlapping elements
    this.checkOverlappingElements(filePath, content.elements, warnings);
  }

  /**
   * Validate a component file
   */
  validateComponent(filePath, content, availableControls, errors, warnings) {
    if (!content.type) {
      errors.push(`${filePath}: Missing 'type' field`);
    }

    // Validate control references
    this.checkControlReferences(filePath, content, availableControls, errors, warnings);
  }

  /**
   * Validate config file
   */
  validateConfig(filePath, content, errors, warnings) {
    // Config should have basic structure
    if (!content.version && !content.defaultPage) {
      warnings.push(`${filePath}: No version or defaultPage specified`);
    }
  }

  /**
   * Validate a scene file
   */
  validateScene(filePath, content, availableControls, errors, warnings) {
    if (!content.name) {
      errors.push(`${filePath}: Missing 'name' field`);
    }

    if (!content.steps || !Array.isArray(content.steps)) {
      errors.push(`${filePath}: Missing or invalid 'steps' array`);
      return;
    }

    // Validate each step
    for (let i = 0; i < content.steps.length; i++) {
      const step = content.steps[i];
      if (!step.device || !step.control) {
        errors.push(`${filePath}: Step ${i + 1} missing device or control`);
        continue;
      }

      // Check control exists
      const controlRef = `${step.device}.${step.control}`;
      const exists = availableControls.some(c =>
        `${c.device_id}.${c.control_id}` === controlRef
      );

      if (!exists) {
        errors.push(`${filePath}: Step ${i + 1} references unknown control '${controlRef}'`);
      }
    }
  }

  /**
   * Validate a single element
   */
  validateElement(filePath, element, index, availableControls, availableScenes, errors, warnings) {
    const elementPath = `${filePath} element[${index}]`;

    // Check type
    if (!element.type) {
      errors.push(`${elementPath}: Missing 'type' field`);
      return;
    }

    // Validate position (required for all elements)
    if (!element.position) {
      errors.push(`${elementPath}: Missing 'position' field`);
    } else {
      const { x, y, width, height } = element.position;
      if (typeof x !== 'number' || typeof y !== 'number' ||
          typeof width !== 'number' || typeof height !== 'number') {
        errors.push(`${elementPath}: Invalid position values`);
      }

      // Check touch-friendly sizes
      if (element.type === 'button' && (width < 60 || height < 60)) {
        warnings.push(`${elementPath}: Button smaller than 60px (not touch-friendly)`);
      }
    }

    // Type-specific validation
    switch (element.type) {
      case 'button':
        this.validateButton(elementPath, element, availableScenes, errors, warnings);
        break;
      case 'slider':
        this.validateSlider(elementPath, element, availableControls, errors, warnings);
        break;
      case 'button-group':
        this.validateButtonGroup(elementPath, element, errors, warnings);
        break;
    }
  }

  /**
   * Validate button element
   */
  validateButton(path, element, availableScenes, errors, warnings) {
    if (!element.label) {
      warnings.push(`${path}: Button missing 'label'`);
    }

    if (!element.action) {
      errors.push(`${path}: Button missing 'action'`);
      return;
    }

    if (element.action.type === 'scene') {
      const sceneId = element.action.scene_id;
      const exists = availableScenes.some(s => s.scene_id === sceneId);

      if (!exists) {
        errors.push(`${path}: References unknown scene '${sceneId}'`);
      }
    }
  }

  /**
   * Validate slider element
   */
  validateSlider(path, element, availableControls, errors, warnings) {
    if (!element.control) {
      errors.push(`${path}: Slider missing 'control' field`);
      return;
    }

    const { device, control_id } = element.control;
    if (!device || !control_id) {
      errors.push(`${path}: Slider control missing device or control_id`);
      return;
    }

    // Check control exists
    const controlRef = `${device}.${control_id}`;
    const exists = availableControls.some(c =>
      `${c.device_id}.${c.control_id}` === controlRef
    );

    if (!exists) {
      errors.push(`${path}: Slider references unknown control '${controlRef}'`);
    }

    // Check range
    if (!element.range || typeof element.range.min !== 'number' || typeof element.range.max !== 'number') {
      warnings.push(`${path}: Slider missing or invalid 'range'`);
    }
  }

  /**
   * Validate button group
   */
  validateButtonGroup(path, element, errors, warnings) {
    if (!element.buttons || !Array.isArray(element.buttons)) {
      errors.push(`${path}: Button group missing 'buttons' array`);
    }
  }

  /**
   * Check control references in object
   */
  checkControlReferences(path, obj, availableControls, errors, warnings, visited = new Set()) {
    if (typeof obj !== 'object' || obj === null) return;

    // Prevent circular references
    if (visited.has(obj)) return;
    visited.add(obj);

    // Check if this object is a control reference
    if (obj.control && obj.control.device && obj.control.control_id) {
      const ref = `${obj.control.device}.${obj.control.control_id}`;
      const exists = availableControls.some(c =>
        `${c.device_id}.${c.control_id}` === ref
      );

      if (!exists) {
        errors.push(`${path}: Control '${ref}' not found`);
      }
    }

    // Recurse
    for (const [key, value] of Object.entries(obj)) {
      this.checkControlReferences(`${path}.${key}`, value, availableControls, errors, warnings, visited);
    }
  }

  /**
   * Check for overlapping elements
   */
  checkOverlappingElements(filePath, elements, warnings) {
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const a = elements[i].position;
        const b = elements[j].position;

        if (!a || !b) continue;

        if (this.rectanglesOverlap(a, b)) {
          warnings.push(
            `${filePath}: Elements ${i} and ${j} overlap (${elements[i].type}, ${elements[j].type})`
          );
        }
      }
    }
  }

  /**
   * Check if two rectangles overlap
   */
  rectanglesOverlap(a, b) {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    );
  }

  /**
   * Validate file path
   */
  isValidFilePath(path) {
    // Must not contain ../ or start with /
    if (path.includes('..') || path.startsWith('/')) {
      return false;
    }

    // Must start with gui/ or scenes/
    if (!path.startsWith('gui/') && !path.startsWith('scenes/')) {
      return false;
    }

    // Must end with .json
    if (!path.endsWith('.json')) {
      return false;
    }

    return true;
  }

  /**
   * Get available controls from database
   */
  async getAvailableControls(controllerId) {
    const result = await pool.query(
      `SELECT dc.control_id, d.device_id
       FROM device_controls dc
       JOIN devices d ON dc.device_id = d.id
       WHERE d.controller_id = $1`,
      [controllerId]
    );

    return result.rows;
  }

  /**
   * Get available scenes from database
   */
  async getAvailableScenes(controllerId) {
    const result = await pool.query(
      `SELECT scene_id FROM scenes WHERE controller_id = $1`,
      [controllerId]
    );

    return result.rows;
  }
}

module.exports = new GUIValidator();
