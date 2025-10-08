/**
 * BaseAIProvider
 * Abstract base class for AI providers (Claude, OpenAI, Gemini)
 *
 * All providers must implement:
 * - generateGUIFiles() - Generate GUI file modifications
 * - streamResponse() - Stream responses for chat interface
 * - estimateTokens() - Estimate token usage before sending
 * - estimateCost() - Estimate cost in USD
 */
class BaseAIProvider {
  /**
   * @param {string} apiKey - API key for the provider
   * @param {Object} config - Provider-specific configuration
   */
  constructor(apiKey, config = {}) {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = apiKey;
    this.config = {
      model: null, // Must be set by subclass
      temperature: 0.7,
      maxTokens: 4096,
      ...config
    };

    this.name = this.constructor.name;
  }

  /**
   * Generate GUI file modifications from user prompt
   *
   * @param {string} userPrompt - User's request
   * @param {Object} context - Context object with:
   *   - {Object} draftFiles - Current draft files
   *   - {Array} devices - Available devices
   *   - {Array} controls - Available controls
   *   - {Array} scenes - Existing scenes
   * @returns {Promise<Object>} - Result with:
   *   - {Object} modifiedFiles - Files to update/create
   *   - {Array} deletedFiles - Files to delete
   *   - {string} explanation - What changed and why
   *   - {Array} warnings - Any warnings or suggestions
   */
  async generateGUIFiles(userPrompt, context) {
    throw new Error('generateGUIFiles() must be implemented by subclass');
  }

  /**
   * Stream a response for chat interface
   *
   * @param {string} userPrompt - User's message
   * @param {Object} context - Context object
   * @param {Function} onChunk - Callback for each chunk: (text) => void
   * @returns {Promise<void>}
   */
  async streamResponse(userPrompt, context, onChunk) {
    throw new Error('streamResponse() must be implemented by subclass');
  }

  /**
   * Estimate token count for a request
   *
   * @param {string} userPrompt - User's message
   * @param {Object} context - Context object
   * @returns {Promise<number>} - Estimated token count
   */
  async estimateTokens(userPrompt, context) {
    // Simple approximation: 1 token ≈ 4 characters
    // Subclasses should override with provider-specific logic
    const contextString = JSON.stringify(context);
    const totalChars = userPrompt.length + contextString.length;
    return Math.ceil(totalChars / 4);
  }

  /**
   * Estimate cost in USD for a request
   *
   * @param {string} userPrompt - User's message
   * @param {Object} context - Context object
   * @returns {Promise<number>} - Estimated cost in USD
   */
  async estimateCost(userPrompt, context) {
    throw new Error('estimateCost() must be implemented by subclass');
  }

  /**
   * Build system prompt for GUI generation
   * Can be overridden by subclasses for provider-specific formatting
   *
   * @param {Object} context - Context object
   * @returns {string} - System prompt
   */
  buildSystemPrompt(context) {
    return `You are an expert AV control system GUI designer. Your task is to generate or modify GUI configuration files based on user requests.

**AVAILABLE RESOURCES:**

Devices:
${JSON.stringify(context.devices || [], null, 2)}

Controls (logical names you can use):
${JSON.stringify(context.controls || [], null, 2)}

Existing Scenes:
${JSON.stringify(context.scenes || [], null, 2)}

Current GUI Files:
${JSON.stringify(context.draftFiles || {}, null, 2)}

**YOUR TASK:**

1. Analyze the user's request
2. Determine which GUI files need to be created or modified
3. Generate valid JSON for each file
4. Use ONLY controls that exist in the available controls list
5. Reference ONLY scenes that exist in the scenes list
6. Follow the GUI file structure shown in examples

**OUTPUT FORMAT:**

You must respond with a JSON object in this exact format:

{
  "modifiedFiles": {
    "gui/pages/main.json": { /* file content */ },
    "gui/components/volume-slider.json": { /* file content */ }
  },
  "deletedFiles": ["gui/pages/old-page.json"],
  "explanation": "Created a main page with volume controls and scene buttons",
  "warnings": ["Control 'zone_a_volume' not found, skipped"]
}

**CONSTRAINTS:**

- File paths must start with 'gui/' or 'scenes/'
- All control references must exist in the available controls list
- All scene references must exist in the scenes list
- JSON must be valid and properly structured
- Use descriptive names for pages and components
- Follow touch-friendly design principles (minimum 60px buttons)

**EXAMPLES:**

Example Button:
{
  "type": "button",
  "label": "Presentation Mode",
  "action": {
    "type": "scene",
    "scene_id": "scene_presentation"
  },
  "position": { "x": 10, "y": 10, "width": 200, "height": 80 },
  "style": { "backgroundColor": "#3B82F6", "color": "#FFFFFF" }
}

Example Slider:
{
  "type": "slider",
  "label": "Master Volume",
  "control": {
    "device": "dsp_main",
    "control_id": "ctrl_master_volume"
  },
  "position": { "x": 10, "y": 100, "width": 300, "height": 60 },
  "range": { "min": 0, "max": 100 },
  "style": { "trackColor": "#E5E7EB", "thumbColor": "#3B82F6" }
}

Now, process the user's request and generate the appropriate GUI files.`;
  }

  /**
   * Parse AI response into structured format
   * Handles different provider response formats
   *
   * @param {string} responseText - Raw AI response
   * @returns {Object} - Parsed response with modifiedFiles, deletedFiles, explanation, warnings
   */
  parseResponse(responseText) {
    try {
      // Try to extract JSON from response (some models wrap it in markdown)
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                        responseText.match(/```\n([\s\S]*?)\n```/) ||
                        [null, responseText];

      const jsonText = jsonMatch[1] || responseText;
      const parsed = JSON.parse(jsonText.trim());

      // Validate structure
      if (!parsed.modifiedFiles && !parsed.deletedFiles) {
        throw new Error('Response missing modifiedFiles or deletedFiles');
      }

      return {
        modifiedFiles: parsed.modifiedFiles || {},
        deletedFiles: parsed.deletedFiles || [],
        explanation: parsed.explanation || 'Files generated successfully',
        warnings: parsed.warnings || []
      };

    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error.message}\n\nRaw response:\n${responseText}`);
    }
  }

  /**
   * Validate that response only references existing controls
   *
   * @param {Object} response - Parsed response
   * @param {Object} context - Context with available controls
   * @returns {Array} - Array of validation errors (empty if valid)
   */
  validateControlReferences(response, context) {
    const errors = [];
    const availableControls = new Set(
      (context.controls || []).map(c => `${c.device_id}.${c.control_id}`)
    );

    const checkObject = (obj, path = '') => {
      if (typeof obj !== 'object' || obj === null) return;

      if (obj.control && obj.control.device && obj.control.control_id) {
        const ref = `${obj.control.device}.${obj.control.control_id}`;
        if (!availableControls.has(ref)) {
          errors.push(`${path}: Control '${ref}' not found in available controls`);
        }
      }

      for (const [key, value] of Object.entries(obj)) {
        checkObject(value, path ? `${path}.${key}` : key);
      }
    };

    for (const [filePath, content] of Object.entries(response.modifiedFiles)) {
      checkObject(content, filePath);
    }

    return errors;
  }
}

module.exports = BaseAIProvider;
