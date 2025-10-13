const BaseAIProvider = require('./base');

// Map legacy or shorthand model names to supported Gemini identifiers
const MODEL_ALIASES = {
  // Legacy 1.5 names mapped to supported Gemini 2.x identifiers
  'gemini-1.5-flash': 'gemini-2.5-flash',
  'gemini-1.5-flash-001': 'gemini-2.5-flash',
  'gemini-1.5-flash-002': 'gemini-2.5-flash',
  'gemini-1.5-flash-latest': 'gemini-flash-latest',
  'gemini-flash': 'gemini-2.5-flash',
  // Pro model aliases
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-1.5-pro-001': 'gemini-2.5-pro',
  'gemini-1.5-pro-002': 'gemini-2.5-pro',
  'gemini-1.5-pro-latest': 'gemini-pro-latest',
  'gemini-pro': 'gemini-pro-latest',
  // Existing identifiers that should pass through
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.5-flash-latest': 'gemini-2.5-flash',
  'gemini-flash-latest': 'gemini-flash-latest',
  'gemini-2.5-pro': 'gemini-2.5-pro',
  'gemini-pro-latest': 'gemini-pro-latest',
  'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
  'gemini-2.0-flash': 'gemini-2.0-flash',
  'gemini-2.0-flash-001': 'gemini-2.0-flash',
  'gemini-2.0-flash-lite': 'gemini-2.0-flash-lite'
};

/**
 * GeminiProvider
 * Google Gemini AI provider for GUI generation
 * Defaults to the widely available Gemini 2.5 Flash model
 */
class GeminiProvider extends BaseAIProvider {
  constructor(apiKey, config = {}) {
    const requestedModel = (config.model || 'gemini-2.5-flash').toLowerCase().trim();
    const canonicalModel = MODEL_ALIASES[requestedModel] || requestedModel;

    super(apiKey, {
      temperature: 0.7,
      maxTokens: 8000,
      ...config,
      model: canonicalModel
    });

    if (!this.config.model) {
      throw new Error('Model name is required for Gemini provider');
    }

    this.apiKey = apiKey;
    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1';

    console.log(
      'GeminiProvider initialized with model:',
      this.config.model,
      '(requested:',
      requestedModel,
      ')'
    );

    // Pricing per million tokens (as of Oct 2024)
    this.pricing = {
      'gemini-2.5-flash': {
        input: 0.10,
        output: 0.40
      },
      'gemini-flash-latest': {
        input: 0.10,
        output: 0.40
      },
      'gemini-2.5-pro': {
        input: 5.00,
        output: 15.00
      },
      'gemini-pro-latest': {
        input: 5.00,
        output: 15.00
      },
      'gemini-2.0-flash': {
        input: 0.08,
        output: 0.32
      },
      'gemini-2.0-flash-lite': {
        input: 0.05,
        output: 0.20
      }
    };

    const pricingKey = this.getPricingKey(this.config.model);
    this.currentPricing = this.pricing[pricingKey] || this.pricing['gemini-2.5-flash'];
  }

  /**
   * Determine pricing key ignoring version suffixes like "-latest" or "-002"
   */
    getPricingKey(modelName) {
      if (!modelName) return 'gemini-2.5-flash';
      const normalized = modelName.replace(/^models\//i, '').toLowerCase();

      if (normalized.startsWith('gemini-flash-latest')) return 'gemini-flash-latest';
      if (normalized.startsWith('gemini-2.5-flash')) return 'gemini-2.5-flash';
      if (normalized.startsWith('gemini-2.5-pro')) return 'gemini-2.5-pro';
      if (normalized.startsWith('gemini-pro')) return 'gemini-pro-latest';
      if (normalized.startsWith('gemini-2.0-flash-lite')) return 'gemini-2.0-flash-lite';
      if (normalized.startsWith('gemini-2.0-flash')) return 'gemini-2.0-flash';

      return normalized.replace(/-preview.*$/i, '').replace(/-exp.*$/i, '');
    }

  /**
   * Execute generateContent call against Gemini HTTP API (v1)
   */
  async generateContentRequest(prompt) {
      const attempts = [];

      const addAttempt = (baseUrl, model) => {
        const key = `${baseUrl}::${model}`;
        if (!attempts.some(entry => entry.key === key)) {
          attempts.push({ key, baseUrl, model });
        }
      };

      const preferredModels = [
        this.config.model,
        'gemini-flash-latest',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-pro-latest',
        'gemini-2.5-pro'
      ].filter(Boolean);

      for (const model of preferredModels) {
        addAttempt('https://generativelanguage.googleapis.com/v1', model);
        addAttempt('https://generativelanguage.googleapis.com/v1beta', model);
      }

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens
      }
    };

    let lastError = null;

    for (const attempt of attempts) {
      try {
        const url = `${attempt.baseUrl}/models/${attempt.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            data?.error?.message ||
            data?.message ||
            `Gemini API request failed with status ${response.status}`;
          const error = new Error(message);
          error.status = response.status;

          if (response.status === 404) {
            lastError = error;
            console.warn(
              `Gemini model ${attempt.model} not available on ${attempt.baseUrl}. Trying fallback...`
            );
            continue;
          }

          throw error;
        }

        if (attempt.model !== this.config.model) {
          console.warn(
            `GeminiProvider falling back to model "${attempt.model}" via ${attempt.baseUrl}`
          );
        }

        return data;
      } catch (error) {
        if (error.status === 404) {
          lastError = error;
          continue;
        }
        lastError = error;
        break;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('Gemini API request failed: no available models/responders');
  }

  extractText(result) {
    const parts =
      result?.candidates?.[0]?.content?.parts ||
      result?.candidates?.[0]?.output || [];

    if (Array.isArray(parts)) {
      return parts
        .map(part => (typeof part === 'string' ? part : part.text || ''))
        .join('');
    }

    return '';
  }

  extractUsage(result) {
    const usage = result?.usageMetadata;
    if (!usage) {
      return {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: this.calculateCost(0, 0)
      };
    }

    return {
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0,
      cost: this.calculateCost(
        usage.promptTokenCount || 0,
        usage.candidatesTokenCount || 0
      )
    };
  }

  /**
   * Generate GUI file modifications from user prompt
   */
  async generateGUIFiles(userPrompt, context) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      let attempt = 0;
      let result = null;
      let responseText = '';
      let parsed = null;
      let promptVariant = fullPrompt;
      let lastParseError = null;

      while (attempt < 2) {
        result = await this.generateContentRequest(promptVariant);
        responseText = this.extractText(result);

        try {
          parsed = this.parseResponse(responseText);
          break;
        } catch (error) {
          lastParseError = error;
          attempt += 1;

          if (attempt >= 2) {
            throw error;
          }

          console.warn('Gemini response was not valid JSON, retrying with stricter instructions');
          promptVariant = `${fullPrompt}\n\nIMPORTANT: Respond ONLY with a JSON object exactly matching the required format. Do not include any prose or markdown.`;
        }
      }

      const usage = this.extractUsage(result);

      return {
        ...parsed,
        usage,
        provider: 'gemini',
        model: this.config.model
      };

    } catch (error) {
      console.error('Gemini API error:', error);
      if (error.status === 404) {
        throw new Error(
          `Gemini generation failed: Model "${this.config.model}" is not available for the current API version. ` +
          'Try one of: gemini-flash-latest, gemini-2.5-flash, gemini-2.0-flash.'
        );
      }
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }

  /**
   * Stream a response for chat interface
   */
  async streamResponse(userPrompt, context, onChunk) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      const result = await this.generateContentRequest(fullPrompt);
      const text = this.extractText(result);
      onChunk(text);

      return {
        fullText: text,
        usage: this.extractUsage(result)
      };

    } catch (error) {
      console.error('Gemini streaming error:', error);
      if (error.status === 404) {
        throw new Error(
          `Gemini streaming failed: Model "${this.config.model}" is not available for the current API version. ` +
          'Try one of: gemini-flash-latest, gemini-2.5-flash, gemini-2.0-flash.'
        );
      }
      throw new Error(`Gemini streaming failed: ${error.message}`);
    }
  }

  /**
   * Send a chat message and get a response
   */
  async chat(messages) {
    try {
      // Convert messages to a single prompt (Gemini doesn't support multi-turn in the same way)
      // Separate system messages and conversation messages
      const systemMessages = messages.filter(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      let fullPrompt = '';

      // Add system context if exists
      if (systemMessages.length > 0) {
        fullPrompt = systemMessages.map(m => m.content).join('\n\n') + '\n\n';
      }

      // Add conversation
      for (const msg of conversationMessages) {
        const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
        fullPrompt += `${roleLabel}: ${msg.content}\n\n`;
      }

      const result = await this.generateContentRequest(fullPrompt);
      const text = this.extractText(result);

      return {
        content: text,
        usage: this.extractUsage(result)
      };

    } catch (error) {
      console.error('Gemini chat error:', error);
      if (error.status === 404) {
        throw new Error(
          `Gemini chat failed: Model "${this.config.model}" is not available for the current API version. ` +
          'Try one of: gemini-flash-latest, gemini-2.5-flash, gemini-2.0-flash.'
        );
      }
      throw new Error(`Gemini chat failed: ${error.message}`);
    }
  }

  /**
   * Estimate token count for a request
   * Gemini uses similar tokenization to GPT
   */
  async estimateTokens(userPrompt, context) {
    const systemPrompt = this.buildSystemPrompt(context);
    const totalChars = userPrompt.length + systemPrompt.length;

    // Gemini approximation: 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(totalChars / 4);

    // Add output buffer
    const outputBuffer = 2000;

    return {
      input: estimatedTokens,
      output: outputBuffer,
      total: estimatedTokens + outputBuffer
    };
  }

  /**
   * Estimate cost in USD for a request
   */
  async estimateCost(userPrompt, context) {
    const tokens = await this.estimateTokens(userPrompt, context);

    const inputCost = (tokens.input / 1_000_000) * this.currentPricing.input;
    const outputCost = (tokens.output / 1_000_000) * this.currentPricing.output;

    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost,
      tokens
    };
  }

  /**
   * Calculate actual cost from usage stats
   */
  calculateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1_000_000) * this.currentPricing.input;
    const outputCost = (outputTokens / 1_000_000) * this.currentPricing.output;

    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost
    };
  }

  /**
   * Get provider info
   */
  getInfo() {
    return {
      name: 'Gemini',
      provider: 'Google',
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      pricing: this.currentPricing,
      features: ['streaming', 'json_mode', 'multimodal', 'free_tier']
    };
  }
}

module.exports = GeminiProvider;
