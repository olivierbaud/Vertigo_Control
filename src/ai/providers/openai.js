const OpenAI = require('openai');
const BaseAIProvider = require('./base');

/**
 * OpenAIProvider
 * OpenAI GPT-4 provider for GUI generation
 * Uses GPT-4 Turbo for structured outputs
 */
class OpenAIProvider extends BaseAIProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, {
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 4096,
      ...config
    });

    this.client = new OpenAI({
      apiKey: this.apiKey
    });

    // Pricing per million tokens (as of Oct 2024)
    this.pricing = {
      'gpt-4-turbo-preview': {
        input: 10.00,   // $10 per 1M input tokens
        output: 30.00   // $30 per 1M output tokens
      },
      'gpt-4o': {
        input: 5.00,    // $5 per 1M input tokens
        output: 15.00   // $15 per 1M output tokens
      },
      'gpt-4o-mini': {
        input: 0.15,    // $0.15 per 1M input tokens
        output: 0.60    // $0.60 per 1M output tokens
      }
    };

    this.currentPricing = this.pricing[this.config.model] || this.pricing['gpt-4-turbo-preview'];
  }

  /**
   * Generate GUI file modifications from user prompt
   */
  async generateGUIFiles(userPrompt, context) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      const responseText = response.choices[0].message.content;
      const parsed = this.parseResponse(responseText);

      // Track usage
      const usage = {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        cost: this.calculateCost(response.usage.prompt_tokens, response.usage.completion_tokens)
      };

      return {
        ...parsed,
        usage,
        provider: 'openai',
        model: this.config.model
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI generation failed: ${error.message}`);
    }
  }

  /**
   * Stream a response for chat interface
   */
  async streamResponse(userPrompt, context, onChunk) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);

      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: true,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      let fullText = '';
      let usage = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          onChunk(delta);
        }

        // Last chunk contains usage
        if (chunk.usage) {
          usage = chunk.usage;
        }
      }

      return {
        fullText,
        usage: usage ? {
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          cost: this.calculateCost(usage.prompt_tokens, usage.completion_tokens)
        } : null
      };

    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw new Error(`OpenAI streaming failed: ${error.message}`);
    }
  }

  /**
   * Send a chat message and get a response
   */
  async chat(messages) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      const responseText = response.choices[0].message.content;

      // Track usage
      const usage = {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        cost: this.calculateCost(response.usage.prompt_tokens, response.usage.completion_tokens)
      };

      return {
        content: responseText,
        usage
      };

    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw new Error(`OpenAI chat failed: ${error.message}`);
    }
  }

  /**
   * Estimate token count for a request
   * OpenAI uses ~4 chars per token as approximation
   */
  async estimateTokens(userPrompt, context) {
    const systemPrompt = this.buildSystemPrompt(context);
    const totalChars = userPrompt.length + systemPrompt.length;

    // GPT approximation: 1 token ≈ 4 characters
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
      name: 'OpenAI',
      provider: 'OpenAI',
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      pricing: this.currentPricing,
      features: ['streaming', 'json_mode', 'function_calling']
    };
  }
}

module.exports = OpenAIProvider;
