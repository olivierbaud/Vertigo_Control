const Anthropic = require('@anthropic-ai/sdk');
const BaseAIProvider = require('./base');

/**
 * ClaudeProvider
 * Anthropic Claude AI provider for GUI generation
 * Uses Claude 3.5 Sonnet for high-quality structured outputs
 */
class ClaudeProvider extends BaseAIProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 8000,
      ...config
    });

    this.client = new Anthropic({
      apiKey: this.apiKey
    });

    // Pricing per million tokens (as of Oct 2024)
    this.pricing = {
      input: 3.00,   // $3 per 1M input tokens
      output: 15.00  // $15 per 1M output tokens
    };
  }

  /**
   * Generate GUI file modifications from user prompt
   */
  async generateGUIFiles(userPrompt, context) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      const responseText = response.content[0].text;
      const parsed = this.parseResponse(responseText);

      // Track usage
      const usage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens)
      };

      return {
        ...parsed,
        usage,
        provider: 'claude',
        model: this.config.model
      };

    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error(`Claude generation failed: ${error.message}`);
    }
  }

  /**
   * Stream a response for chat interface
   */
  async streamResponse(userPrompt, context, onChunk) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);

      const stream = await this.client.messages.stream({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      let fullText = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text;
          fullText += text;
          onChunk(text);
        }
      }

      // Get final message with usage stats
      const finalMessage = await stream.finalMessage();

      return {
        fullText,
        usage: {
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
          totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
          cost: this.calculateCost(finalMessage.usage.input_tokens, finalMessage.usage.output_tokens)
        }
      };

    } catch (error) {
      console.error('Claude streaming error:', error);
      throw new Error(`Claude streaming failed: ${error.message}`);
    }
  }

  /**
   * Send a chat message and get a response
   */
  async chat(messages) {
    try {
      // Separate system messages from user/assistant messages
      const systemMessages = messages.filter(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      // Claude expects a single system parameter, not in messages array
      const systemPrompt = systemMessages.map(m => m.content).join('\n\n');

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt || undefined,
        messages: conversationMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      const responseText = response.content[0].text;

      // Track usage
      const usage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens)
      };

      return {
        content: responseText,
        usage
      };

    } catch (error) {
      console.error('Claude chat error:', error);
      throw new Error(`Claude chat failed: ${error.message}`);
    }
  }

  /**
   * Estimate token count for a request
   * Claude uses ~4 chars per token as approximation
   */
  async estimateTokens(userPrompt, context) {
    const systemPrompt = this.buildSystemPrompt(context);
    const totalChars = userPrompt.length + systemPrompt.length;

    // Claude approximation: 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(totalChars / 4);

    // Add output buffer (estimated response size)
    const outputBuffer = 2000; // Assume ~2000 tokens for GUI JSON output

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

    const inputCost = (tokens.input / 1_000_000) * this.pricing.input;
    const outputCost = (tokens.output / 1_000_000) * this.pricing.output;

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
    const inputCost = (inputTokens / 1_000_000) * this.pricing.input;
    const outputCost = (outputTokens / 1_000_000) * this.pricing.output;

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
      name: 'Claude',
      provider: 'Anthropic',
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      pricing: this.pricing,
      features: ['streaming', 'structured_output', 'long_context']
    };
  }
}

module.exports = ClaudeProvider;
