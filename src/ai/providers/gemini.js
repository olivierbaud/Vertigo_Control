const { GoogleGenerativeAI } = require('@google/generative-ai');
const BaseAIProvider = require('./base');

// Map legacy or shorthand model names to supported Gemini identifiers
const MODEL_ALIASES = {
  'gemini-pro': 'gemini-1.5-pro',
  'gemini-pro-latest': 'gemini-1.5-pro',
  'gemini-1.5-pro': 'gemini-1.5-pro',
  'gemini-1.5-pro-001': 'gemini-1.5-pro',
  'gemini-1.5-pro-002': 'gemini-1.5-pro',
  'gemini-1.5-pro-latest': 'gemini-1.5-pro',
  'gemini-flash': 'gemini-1.5-flash',
  'gemini-1.5-flash': 'gemini-1.5-flash',
  'gemini-1.5-flash-001': 'gemini-1.5-flash',
  'gemini-1.5-flash-002': 'gemini-1.5-flash',
  'gemini-1.5-flash-latest': 'gemini-1.5-flash',
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
    const requestedModel = (config.model || 'gemini-1.5-flash').toLowerCase().trim();
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

    this.genAI = new GoogleGenerativeAI(apiKey, { apiVersion: 'v1' });
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model
    });

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
   * Generate GUI file modifications from user prompt
   */
  async generateGUIFiles(userPrompt, context) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens
          // Note: responseMimeType not supported in v1 API
        }
      });

      const response = result.response;
      const responseText = response.text();
      const parsed = this.parseResponse(responseText);

      // Track usage (Gemini provides token counts)
      const usage = {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
        cost: this.calculateCost(
          response.usageMetadata?.promptTokenCount || 0,
          response.usageMetadata?.candidatesTokenCount || 0
        )
      };

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

      const result = await this.model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens
        }
      });

      let fullText = '';
      let usageMetadata = null;

      for await (const chunk of result.stream) {
        const text = chunk.text();
        fullText += text;
        onChunk(text);

        // Last chunk contains usage metadata
        if (chunk.usageMetadata) {
          usageMetadata = chunk.usageMetadata;
        }
      }

      return {
        fullText,
        usage: usageMetadata ? {
          inputTokens: usageMetadata.promptTokenCount,
          outputTokens: usageMetadata.candidatesTokenCount,
          totalTokens: usageMetadata.totalTokenCount,
          cost: this.calculateCost(usageMetadata.promptTokenCount, usageMetadata.candidatesTokenCount)
        } : null
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
