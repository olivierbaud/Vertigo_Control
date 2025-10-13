import { useState } from 'react';

export default function DriverTester({ driverData, onTestComplete }) {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const runValidation = async () => {
    if (!driverData.driverId) {
      alert('No driver ID found');
      return;
    }

    setTesting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/drivers/${driverData.driverId}/validate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Validation failed');

      const results = await response.json();
      setTestResults(results);
      onTestComplete(results);
    } catch (error) {
      alert(`Validation error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Test & Validate Driver
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Validate the driver code for syntax errors and security issues before deployment.
        </p>
      </div>

      {/* Test Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={runValidation}
          disabled={testing || !driverData.driverId}
          className="p-6 border-2 border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20
                     transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-4">
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Syntax Validation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Check for code errors and security issues
              </p>
            </div>
          </div>
        </button>

        <div className="p-6 border-2 border-gray-300 dark:border-gray-600 rounded-lg opacity-50 cursor-not-allowed text-left">
          <div className="flex items-center gap-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Live Device Test
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Coming soon: Test against real hardware
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className={`
            rounded-lg p-4 border-2
            ${testResults.valid
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
              : 'bg-red-50 dark:bg-red-900/20 border-red-500'
            }
          `}>
            <div className="flex items-center gap-3">
              {testResults.valid ? (
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <div>
                <h3 className={`text-lg font-semibold ${testResults.valid ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                  {testResults.valid ? 'Validation Passed' : 'Validation Failed'}
                </h3>
                <p className={`text-sm ${testResults.valid ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  {testResults.valid
                    ? 'Your driver code is valid and ready for deployment'
                    : 'Please fix the errors below before deploying'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Errors */}
          {testResults.errors && testResults.errors.length > 0 && (
            <div>
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-3">
                Errors ({testResults.errors.length})
              </h4>
              <div className="space-y-2">
                {testResults.errors.map((error, index) => (
                  <div key={index} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-red-800 dark:text-red-200 flex-1">{error}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {testResults.warnings && testResults.warnings.length > 0 && (
            <div>
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
                Warnings ({testResults.warnings.length})
              </h4>
              <div className="space-y-2">
                {testResults.warnings.map((warning, index) => (
                  <div key={index} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-yellow-800 dark:text-yellow-200 flex-1">{warning}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Summary */}
          {testResults.valid && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                ✓ Driver Validated
              </h4>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <li>• Extends BaseDriver correctly</li>
                <li>• All required methods implemented</li>
                <li>• No security vulnerabilities detected</li>
                <li>• Code syntax is valid</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {testing && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Running validation tests...</p>
        </div>
      )}

      {/* Instructions */}
      {!testResults && !testing && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Testing Instructions
          </h4>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">1.</span>
              <span>Click "Syntax Validation" to check your driver code for errors</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">2.</span>
              <span>Fix any errors that are reported</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">3.</span>
              <span>Once validation passes, you can proceed to deploy the driver</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
