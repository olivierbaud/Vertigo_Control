import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Step components
import ProtocolInput from '../components/driver/ProtocolInput';
import AiGeneration from '../components/driver/AiGeneration';
import CodeEditor from '../components/driver/CodeEditor';
import DriverTester from '../components/driver/DriverTester';
import Deployment from '../components/driver/Deployment';

export default function DriverCreator() {
  const [currentStep, setCurrentStep] = useState(1);
  const [driverData, setDriverData] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  const steps = [
    { number: 1, name: 'Protocol', component: ProtocolInput },
    { number: 2, name: 'Generate', component: AiGeneration },
    { number: 3, name: 'Edit Code', component: CodeEditor },
    { number: 4, name: 'Test', component: DriverTester },
    { number: 5, name: 'Deploy', component: Deployment }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleProtocolSubmit = async (protocolSpec) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/drivers/generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(protocolSpec)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate driver');
      }

      const result = await response.json();

      setDriverData({
        ...protocolSpec,
        ...result,
        generatedAt: new Date().toISOString()
      });

      handleNext();
    } catch (error) {
      alert(`Error generating driver: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeUpdate = (newCode) => {
    setDriverData({
      ...driverData,
      driverCode: newCode
    });
  };

  const handleRefine = async (refinementPrompt) => {
    if (!driverData.driverId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/drivers/${driverData.driverId}/refine`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refinementPrompt,
            provider: driverData.provider || 'claude'
          })
        }
      );

      if (!response.ok) throw new Error('Failed to refine driver');

      const result = await response.json();

      setDriverData({
        ...driverData,
        driverCode: result.driverCode
      });

      alert('Driver refined successfully!');
    } catch (error) {
      alert(`Error refining driver: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestComplete = (testResults) => {
    setDriverData({
      ...driverData,
      testResults
    });
  };

  const handleDeployComplete = () => {
    alert('Driver deployed successfully!');
    navigate(`/drivers/${driverData.driverId}`);
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Device Driver with AI
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Describe your protocol and let AI generate the driver code
          </p>
        </div>

        <button
          onClick={() => navigate('/drivers')}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => (
              <li key={step.number} className="relative flex-1">
                {/* Step */}
                <div className="flex items-center">
                  <div className="flex items-center">
                    <span
                      className={`
                        flex items-center justify-center w-10 h-10 rounded-full border-2
                        ${currentStep > step.number
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : currentStep === step.number
                          ? 'border-blue-600 bg-white dark:bg-gray-800 text-blue-600'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }
                      `}
                    >
                      {currentStep > step.number ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        step.number
                      )}
                    </span>
                    <span className={`
                      ml-3 text-sm font-medium
                      ${currentStep >= step.number
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                      }
                    `}>
                      {step.name}
                    </span>
                  </div>

                  {/* Connector */}
                  {index < steps.length - 1 && (
                    <div className={`
                      flex-1 h-0.5 ml-4
                      ${currentStep > step.number
                        ? 'bg-blue-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                      }
                    `} />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              {currentStep === 2 ? 'AI is generating your driver...' : 'Processing...'}
            </p>
          </div>
        ) : (
          <CurrentStepComponent
            driverData={driverData}
            onNext={handleNext}
            onBack={handleBack}
            onSubmit={handleProtocolSubmit}
            onCodeUpdate={handleCodeUpdate}
            onRefine={handleRefine}
            onTestComplete={handleTestComplete}
            onDeployComplete={handleDeployComplete}
            isFirstStep={currentStep === 1}
            isLastStep={currentStep === steps.length}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      {!loading && currentStep !== 2 && (
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`
              px-6 py-2 rounded-lg transition-colors
              ${currentStep === 1
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            Back
          </button>

          {currentStep < steps.length && currentStep !== 1 && (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              Next Step
            </button>
          )}
        </div>
      )}
    </div>
  );
}
