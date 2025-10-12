import { useState } from 'react';

export default function CodeEditor({ driverData, onCodeUpdate, onRefine }) {
  const [code, setCode] = useState(driverData.driverCode || '');
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [refining, setRefining] = useState(false);

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    onCodeUpdate(newCode);
  };

  const handleRefine = async () => {
    if (!refinementPrompt.trim()) {
      alert('Please enter a refinement prompt');
      return;
    }

    setRefining(true);
    try {
      await onRefine(refinementPrompt);
      setRefinementPrompt('');
      setShowRefineDialog(false);
    } catch (error) {
      alert(`Refinement failed: ${error.message}`);
    } finally {
      setRefining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Driver Code Editor
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Review and edit the generated driver code. Click "Refine with AI" to make changes.
          </p>
        </div>

        <button
          onClick={() => setShowRefineDialog(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                     dark:bg-purple-500 dark:hover:bg-purple-600 transition-colors
                     flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Refine with AI
        </button>
      </div>

      {/* Code Editor */}
      <div className="relative">
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
            title="Copy to clipboard"
          >
            Copy
          </button>
        </div>

        <textarea
          value={code}
          onChange={handleCodeChange}
          className="w-full h-[600px] px-4 py-3 font-mono text-sm
                     bg-gray-900 text-gray-100 rounded-lg
                     border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500
                     resize-none overflow-auto"
          spellCheck="false"
        />
      </div>

      {/* File Info */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div>
          Lines: {code.split('\n').length} |
          Characters: {code.length}
        </div>
        <div>
          {driverData.className}.js
        </div>
      </div>

      {/* Refine Dialog */}
      {showRefineDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Refine Driver with AI
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What would you like to change?
                </label>
                <textarea
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  rows={6}
                  placeholder="Examples:
- Add checksum validation to all commands
- Implement retry logic with exponential backoff
- Add support for binary protocol mode
- Improve error handling for timeout scenarios"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  💡 Tip: Be specific about what you want to change. The AI will modify the existing code based on your instructions.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRefineDialog(false);
                  setRefinementPrompt('');
                }}
                disabled={refining}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefine}
                disabled={refining || !refinementPrompt.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                           flex items-center gap-2"
              >
                {refining ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Refining...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Refine Code
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
