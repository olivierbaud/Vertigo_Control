import { useEffect } from 'react';

export default function AiGeneration({ driverData, onNext }) {
  useEffect(() => {
    // Auto-advance after data is loaded
    if (driverData.driverCode) {
      const timer = setTimeout(() => {
        onNext();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [driverData, onNext]);

  if (!driverData.driverCode) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          AI is generating your driver...
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          This usually takes 10-30 seconds. The AI is analyzing your protocol and generating production-ready code.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
              Driver Generated Successfully!
            </h3>
            <p className="text-green-800 dark:text-green-200">
              {driverData.explanation || 'Your driver has been generated and is ready for review.'}
            </p>
          </div>
        </div>
      </div>

      {/* Generation Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Class Name</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {driverData.className || 'CustomDriver'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Commands Generated</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {driverData.commands?.length || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">AI Provider</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
            {driverData.provider || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Commands List */}
      {driverData.commands && driverData.commands.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Generated Commands
          </h3>
          <div className="space-y-2">
            {driverData.commands.map((cmd, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {cmd.display_name || cmd.name}
                    </span>
                    <span className="ml-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                      {cmd.type}
                    </span>
                    {cmd.control_type && (
                      <span className="ml-2 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                        {cmd.control_type}
                      </span>
                    )}
                  </div>
                </div>
                {cmd.protocol_template && (
                  <code className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {cmd.protocol_template}
                  </code>
                )}
                {cmd.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {cmd.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Protocol Notes */}
      {driverData.protocolNotes && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Protocol Notes
          </h4>
          <p className="text-yellow-800 dark:text-yellow-200 text-sm whitespace-pre-wrap">
            {driverData.protocolNotes}
          </p>
        </div>
      )}

      {/* Usage Stats */}
      {driverData.usage && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Tokens Used: <span className="font-semibold text-gray-900 dark:text-white">
                {driverData.usage.totalTokens?.toLocaleString() || 0}
              </span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Cost: <span className="font-semibold text-gray-900 dark:text-white">
                ${driverData.usage.cost?.total?.toFixed(4) || '0.0000'}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Next Step Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              What's Next?
            </h4>
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              You can now review and edit the generated code, test it, and deploy it to your controllers.
              The code editor includes syntax highlighting and you can ask AI to refine the code if needed.
            </p>
          </div>
        </div>
      </div>

      {/* Auto-advancing message */}
      <div className="text-center text-gray-600 dark:text-gray-400 text-sm">
        Advancing to code editor in 2 seconds...
      </div>
    </div>
  );
}
