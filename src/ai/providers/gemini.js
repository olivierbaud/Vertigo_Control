const { GoogleGenerativeAI } = require('@google/generative-ai');
const BaseAIProvider = require('./base');

/**
 * GeminiProvider
 * Google Gemini AI provider for GUI generation
 * Uses Gemini 2.0 Flash for fast, cost-effective generation
 */
class GeminiProvider extends BaseAIProvider {
  constructor(apiKey, config = {}) {
    // Default to stable Gemini 1.5 Flash model
    super(apiKey, {
      model: config.model || 'gemini-1.5-flash',
      temperature: 0.7,
      maxTokens: 8000,
      ...config
    });

    console.log('GeminiProvider initialized with model:', this.config.model);

    if (!this.config.model) {
      throw new Error('Model name is required for Gemini provider');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model
    });

    // Pricing per million tokens (as of Oct 2024)
    // Gemini 2.0 Flash is free during experimental period
    this.pricing = {
      'gemini-2.0-flash-exp': {
        input: 0.00,   // Free during experimental
        output: 0.00
      },
      'gemini-1.5-pro': {
        input: 3.50,   // $3.50 per 1M input tokens
        output: 10.50  // $10.50 per 1M output tokens
      },
      'gemini-1.5-flash': {
        input: 0.075,  // $0.075 per 1M input tokens
        output: 0.30   // $0.30 per 1M output tokens
      }
    };

    this.currentPricing = this.pricing[this.config.model] || this.pricing['gemini-2.0-flash-exp'];
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
          maxOutputTokens: this.config.maxTokens,
          responseMimeType: 'application/json'
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
