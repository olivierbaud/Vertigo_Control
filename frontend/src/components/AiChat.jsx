import { useState, useRef, useEffect } from 'react';
import api from '../utils/api';

function AiChat({ controllerId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState('gemini'); // Default to free provider
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await api.post(`/api/controllers/${controllerId}/ai/chat`, {
        prompt: input,
        provider: provider
      });

      if (response.data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: response.data.result.explanation,
          modifiedFiles: response.data.result.modifiedFiles || [],
          warnings: response.data.result.warnings || [],
          usage: response.data.usage,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setError(response.data.error || 'Failed to get AI response');
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setError(err.response?.data?.error || 'Failed to communicate with AI');

      // Add error message
      const errorMessage = {
        role: 'system',
        content: `Error: ${err.response?.data?.error || 'Failed to communicate with AI'}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-300px)] bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-none border dark:border-gray-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 text-white p-4 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">AI Assistant</h2>
            <p className="text-sm text-primary-100 dark:text-primary-200">
              Describe your GUI and I'll generate it for you
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-primary-100 dark:text-primary-200">Provider:</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="px-3 py-1 rounded bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium border dark:border-gray-600"
              disabled={loading}
            >
              <option value="gemini">Gemini 2.5 Flash (Free)</option>
              <option value="claude">Claude 3.5 Sonnet</option>
              <option value="openai">GPT-4 Turbo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-lg font-medium mb-2 dark:text-gray-300">Start a conversation</p>
            <p className="text-sm dark:text-gray-400">
              Try: "Create a main page with volume controls and scene buttons"
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-primary-600 dark:bg-primary-700 text-white'
                  : message.role === 'assistant'
                  ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {message.role === 'user' ? 'You' : message.role === 'assistant' ? 'AI Assistant' : 'System'}
                </span>
                <span className={`text-xs ${
                  message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                }`}>
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>

              {/* Message Content */}
              <div className={`whitespace-pre-wrap ${
                message.role === 'user' ? 'text-white' : 'text-gray-800 dark:text-gray-200'
              }`}>
                {message.content}
              </div>

              {/* Modified Files */}
              {message.modifiedFiles && message.modifiedFiles.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Modified Files:
                  </p>
                  <div className="space-y-1">
                    {message.modifiedFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded"
                      >
                        <span className="text-gray-700 dark:text-gray-300 font-mono">{file}</span>
                        <button
                          onClick={() => copyToClipboard(file)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {message.warnings && message.warnings.length > 0 && (
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <p className="text-xs font-semibold text-yellow-700 mb-2">
                    ⚠️ Warnings:
                  </p>
                  <ul className="space-y-1">
                    {message.warnings.map((warning, i) => (
                      <li key={i} className="text-xs text-yellow-700">
                        • {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Usage Stats */}
              {message.usage && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Tokens: {message.usage.totalTokens?.toLocaleString()}
                    </span>
                    {message.usage.cost && (
                      <span>
                        Cost: ${message.usage.cost.total?.toFixed(4) || '0.00'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Copy Button */}
              <button
                onClick={() => copyToClipboard(message.content)}
                className={`mt-2 text-xs ${
                  message.role === 'user'
                    ? 'text-blue-100 hover:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
                }`}
              >
                Copy message
              </button>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">⚠️ {error}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 rounded-b-lg">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your GUI design... (Press Enter to send, Shift+Enter for new line)"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows="3"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              loading || !input.trim()
                ? 'bg-gray-300 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 dark:bg-primary-700 text-white hover:bg-primary-600 dark:bg-primary-700'
            }`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Send</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
            )}
          </button>
        </div>

        {/* Helper Text */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            💡 Example: "Add a volume slider for Main Audio and buttons for Meeting Start and Meeting End scenes"
          </span>
          <span>
            {provider === 'gemini' && '✨ Using free provider'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AiChat;
