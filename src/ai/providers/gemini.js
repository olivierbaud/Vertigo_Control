const BaseAIProvider = require('./base');

// Map legacy or shorthand model names to supported Gemini identifiers
const MODEL_ALIASES = {
  'gemini-pro': 'gemini-1.5-pro-latest',
  'gemini-pro-latest': 'gemini-1.5-pro-latest',
  'gemini-1.5-pro': 'gemini-1.5-pro-latest',
  'gemini-1.5-pro-001': 'gemini-1.5-pro-001',
  'gemini-1.5-pro-002': 'gemini-1.5-pro-002',
  'gemini-1.5-pro-latest': 'gemini-1.5-pro-latest',
  'gemini-flash': 'gemini-1.5-flash-latest',
  'gemini-1.5-flash': 'gemini-1.5-flash-latest',
  'gemini-1.5-flash-001': 'gemini-1.5-flash-001',
  'gemini-1.5-flash-002': 'gemini-1.5-flash-002',
  'gemini-1.5-flash-latest': 'gemini-1.5-flash-latest',
  'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
  'gemini-2.0-flash': 'gemini-2.0-flash'
};

/**
 * GeminiProvider
 * Google Gemini AI provider for GUI generation
 * Defaults to the widely available Gemini 1.5 Flash model
 */
class GeminiProvider extends BaseAIProvider {
  constructor(apiKey, config = {}) {
    const requestedModel = (config.model || 'gemini-1.5-flash-latest').toLowerCase().trim();
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
      'gemini-2.0-flash': {
        input: 0.0,
        output: 0.0
      },
      'gemini-2.0-flash-exp': {
        input: 0.0,
        output: 0.0
      },
      'gemini-1.5-pro': {
        input: 3.5,
        output: 10.5
      },
      'gemini-1.5-flash': {
        input: 0.075,
        output: 0.30
      }
    };

    const pricingKey = this.getPricingKey(this.config.model);
    this.currentPricing = this.pricing[pricingKey] || this.pricing['gemini-1.5-flash'];
  }

  /**
   * Determine pricing key ignoring version suffixes like "-latest" or "-002"
   */
  getPricingKey(modelName) {
    if (!modelName) return 'gemini-1.5-flash';
    const normalized = modelName
      .replace(/-latest$/i, '')
      .replace(/-\d{3}$/i, '');
    return normalized;
  }

  /**
   * Execute generateContent call against Gemini HTTP API (v1)
   */
  async generateContentRequest(prompt) {
    const attempts = [
      {
        baseUrl: 'https://generativelanguage.googleapis.com/v1',
        model: this.config.model
      },
      {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        model: this.config.model
      }
    ];

    // If configured model is already a legacy name, don't push duplicate
    if (!['gemini-pro', 'gemini-pro-vision'].includes(this.config.model)) {
      attempts.push({
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-pro'
      });
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

      const result = await this.generateContentRequest(fullPrompt);
      const responseText = this.extractText(result);
      const parsed = this.parseResponse(responseText);

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
          'Try one of: gemini-1.5-flash-latest, gemini-1.5-pro-latest, gemini-2.0-flash.'
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
          'Try one of: gemini-1.5-flash-latest, gemini-1.5-pro-latest, gemini-2.0-flash.'
        );
      }
      throw new Error(`Gemini streaming failed: ${error.message}`);
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
