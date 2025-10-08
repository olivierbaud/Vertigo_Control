import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { controllersAPI, aiAPI, guiAPI } from '../utils/api';

const ControllerDetail = () => {
  const { controllerId } = useParams();
  const [controller, setController] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [guiStatus, setGuiStatus] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('claude');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch controller details
  useEffect(() => {
    if (controllerId) {
      fetchController();
      fetchGuiStatus();
    }
  }, [controllerId]);

  const fetchController = async () => {
    try {
      const response = await controllersAPI.getOne(controllerId);
      setController(response.data);
    } catch (error) {
      console.error('Failed to fetch controller:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuiStatus = async () => {
    try {
      const response = await guiAPI.getStatus(controllerId);
      setGuiStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch GUI status:', error);
    }
  };

  // Handle sending message to AI
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);

    const assistantMessage = { role: 'assistant', content: '', streaming: true };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      await aiAPI.chat(controllerId, inputMessage, selectedProvider, (chunk) => {
        if (chunk.type === 'content') {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.role === 'assistant') {
              lastMessage.content += chunk.data;
            }
            return newMessages;
          });
        } else if (chunk.type === 'done') {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.role === 'assistant') {
              lastMessage.streaming = false;
            }
            return newMessages;
          });
          setIsStreaming(false);
          fetchGuiStatus(); // Refresh GUI status after AI response
        } else if (chunk.type === 'error') {
          console.error('AI error:', chunk.data);
          setIsStreaming(false);
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', error: true }
      ]);
      setIsStreaming(false);
    }
  };

  // Handle deploy action
  const handleDeploy = async () => {
    if (!window.confirm('Deploy draft files to deployed state?')) return;

    try {
      const commitMessage = prompt('Enter a commit message (optional):') || 'Deployed from AI chat';
      await guiAPI.deploy(controllerId, commitMessage);
      alert('Files deployed successfully!');
      fetchGuiStatus();
    } catch (error) {
      console.error('Failed to deploy:', error);
      alert('Failed to deploy files');
    }
  };

  // Handle sync action
  const handleSync = async () => {
    if (!window.confirm('Sync deployed files to the controller?')) return;

    try {
      const response = await guiAPI.sync(controllerId);
      alert(`Sync started! ID: ${response.data.sync_id}`);
      // Could implement sync progress tracking here
      fetchGuiStatus();
    } catch (error) {
      console.error('Failed to sync:', error);
      alert(error.response?.data?.error || 'Failed to sync files');
    }
  };

  // Handle discard changes
  const handleDiscard = async () => {
    if (!window.confirm('Discard all draft changes? This cannot be undone.')) return;

    try {
      await guiAPI.discard(controllerId);
      alert('Draft changes discarded');
      fetchGuiStatus();
      setMessages([]);
    } catch (error) {
      console.error('Failed to discard:', error);
      alert('Failed to discard changes');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!controller) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Controller not found</h2>
          <p className="text-gray-600 mt-2">The controller you're looking for doesn't exist</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left side: AI Chat */}
      <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
        {/* Chat header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{controller.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  controller.status === 'online' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-1 ${
                    controller.status === 'online' ? 'bg-green-600' : 'bg-gray-600'
                  }`}></span>
                  {controller.status}
                </span>
                {guiStatus && (
                  <span className="text-xs text-gray-500">
                    Draft v{guiStatus.draft_version} | Deployed v{guiStatus.deployed_version} | Live v{guiStatus.live_version}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* AI Settings Panel */}
          {showSettings && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">AI Settings</h3>
              <div>
                <label className="block text-sm text-gray-700 mb-2">AI Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="openai">GPT-4 (OpenAI)</option>
                  <option value="gemini">Gemini (Google)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="p-4 bg-primary-100 rounded-full inline-block mb-4">
                  <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to AI-Powered GUI Design</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Describe what you want to create, and I'll generate a complete touch panel interface for you.
                </p>
                <div className="text-left space-y-2">
                  <p className="text-sm text-gray-700"><span className="font-semibold">Example:</span></p>
                  <p className="text-sm text-gray-600 italic">"Create a main page with volume sliders for each zone"</p>
                  <p className="text-sm text-gray-600 italic">"Add a button to mute all microphones"</p>
                  <p className="text-sm text-gray-600 italic">"Make a source selection menu for HDMI inputs"</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div className={`max-w-3xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' ? 'bg-primary-600' : 'bg-gray-200'
                    }`}>
                      {message.role === 'user' ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                    </div>
                    <div className={`flex-1 px-4 py-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-primary-600 text-white' 
                        : message.error 
                          ? 'bg-red-50 text-red-900'
                          : 'bg-gray-100 text-gray-900'
                    }`}>
                      <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                      {message.streaming && (
                        <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1"></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isStreaming}
              placeholder="Describe what you want to create..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isStreaming || !inputMessage.trim()}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isStreaming ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Thinking...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  Send
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right side: GUI Preview & Controls */}
      <div className="w-96 flex flex-col bg-gray-50">
        {/* Preview header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">GUI Preview & Controls</h3>
        </div>

        {/* Deploy/Sync Controls */}
        <div className="p-4 space-y-3 border-b border-gray-200 bg-white">
          {guiStatus && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Draft Version:</span>
                <span className="font-medium text-gray-900">v{guiStatus.draft_version}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Deployed Version:</span>
                <span className="font-medium text-gray-900">v{guiStatus.deployed_version}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Live Version:</span>
                <span className="font-medium text-gray-900">v{guiStatus.live_version}</span>
              </div>
              {guiStatus.has_unsaved_changes && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Unsaved changes in draft
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleDeploy}
            disabled={!guiStatus?.has_unsaved_changes}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Deploy Draft → Deployed
          </button>

          <button
            onClick={handleSync}
            disabled={controller.status !== 'online'}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Deployed → Live
          </button>

          <button
            onClick={handleDiscard}
            disabled={!guiStatus?.has_unsaved_changes}
            className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Discard Changes
          </button>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-full">
            <p className="text-sm text-gray-500 text-center">
              GUI preview will be rendered here
            </p>
            <p className="text-xs text-gray-400 text-center mt-2">
              (Preview feature coming soon)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControllerDetail;
