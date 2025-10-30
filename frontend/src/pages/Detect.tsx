import React, { useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadBox } from '../components/UploadBox';
import { ResultCard } from '../components/ResultCard';
import { predictDisease, PredictionResponse, createExpertRequest, getHistory } from '../lib/auth-api';
import { AuthContext } from '../contexts/AuthContext';

const Detect: React.FC = () => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [detectionId, setDetectionId] = useState<string | null>(null);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [expertMessage, setExpertMessage] = useState('');
  const [isSubmittingExpert, setIsSubmittingExpert] = useState(false);
  const [expertSubmitted, setExpertSubmitted] = useState(false);
  const { user } = useContext(AuthContext);

  // Restore state from sessionStorage on component mount (but not on page reload)
  useEffect(() => {
    // Check if this is a page reload vs navigation
    const isPageReload = performance.navigation?.type === 1 || 
                        (performance.getEntriesByType('navigation')[0] as any)?.type === 'reload';
    
    if (!isPageReload) {
      const savedState = sessionStorage.getItem('detectPageState');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (state.preview) setPreview(state.preview);
          if (state.result) setResult(state.result);
          if (state.detectionId) setDetectionId(state.detectionId);
          if (state.expertSubmitted) setExpertSubmitted(state.expertSubmitted);
        } catch (err) {
          console.error('Failed to restore detection state:', err);
        }
      }
    } else {
      // Clear storage on page reload
      sessionStorage.removeItem('detectPageState');
    }
  }, []);

  // Save state to sessionStorage whenever key state changes
  useEffect(() => {
    if (preview || result || detectionId || expertSubmitted) {
      const state = {
        preview,
        result,
        detectionId,
        expertSubmitted
      };
      sessionStorage.setItem('detectPageState', JSON.stringify(state));
    }
  }, [preview, result, detectionId, expertSubmitted]);

  const handleFileSelect = async (selectedFile: File) => {
    // Require login before attempting to call protected predict endpoint
    if (!user) {
      setError('Please log in to use the disease detection feature.');
      return;
    }
    try {
      // Validate file size
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError(t('detect.errors.size'));
        return;
      }

      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(selectedFile.type)) {
        setError(t('detect.errors.format'));
        return;
      }

      // Set preview
      const previewUrl = URL.createObjectURL(selectedFile);
      setPreview(previewUrl);
      setError('');
      setResult(null);

      // Upload and predict
      setIsLoading(true);
      const prediction = await predictDisease(selectedFile);
      setResult(prediction);
      
      // Get the latest detection ID for PDF download
      try {
        const history = await getHistory();
        if (history.length > 0) {
          setDetectionId(history[0].id); // Get the most recent detection
        }
      } catch (err) {
        console.error('Failed to get detection ID:', err);
      }
    } catch (err: any) {
      console.error('Upload/predict failed:', err);
      const msg = err?.message || t('detect.errors.upload');
      setError(typeof msg === 'string' ? msg : t('detect.errors.upload'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetDetection = () => {
    setPreview('');
    setResult(null);
    setError('');
    setDetectionId(null);
    setShowExpertModal(false);
    setExpertMessage('');
    setExpertSubmitted(false);
    // Clear persisted state
    sessionStorage.removeItem('detectPageState');
  };

  const handleExpertConsultation = () => {
    setShowExpertModal(true);
  };

  const submitExpertRequest = async () => {
    if (!result || !expertMessage.trim()) return;
    
    setIsSubmittingExpert(true);
    try {
      await createExpertRequest(result.disease_name, expertMessage);
      setExpertSubmitted(true);
      setShowExpertModal(false);
      setExpertMessage('');
    } catch (err) {
      console.error('Failed to submit expert request:', err);
      setError('Failed to submit expert consultation request. Please try again.');
    } finally {
      setIsSubmittingExpert(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!detectionId) {
      setError('No detection ID available for PDF download');
      return;
    }
    
    try {
      const { downloadHistoryPDF } = await import('../lib/auth-api');
      await downloadHistoryPDF(detectionId);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setError('Failed to download PDF. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl">
              <span className="text-3xl">🌽</span>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
            🔍 {t('detect.title')}
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Upload a clear image of your corn leaf to get instant AI-powered disease detection and expert treatment recommendations
          </p>
          
          {/* Progress Indicators */}
          <div className="mt-8 flex justify-center items-center space-x-4">
            <div className={`flex items-center ${preview ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${preview ? 'bg-green-100' : 'bg-gray-100'}`}>
                {preview ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">1</span>
                )}
              </div>
              <span className="font-medium">Upload Image</span>
            </div>
            
            <div className="h-1 w-8 bg-gray-300 rounded"></div>
            
            <div className={`flex items-center ${isLoading ? 'text-blue-600' : result ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${isLoading ? 'bg-blue-100' : result ? 'bg-green-100' : 'bg-gray-100'}`}>
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : result ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">2</span>
                )}
              </div>
              <span className="font-medium">AI Analysis</span>
            </div>
            
            <div className="h-1 w-8 bg-gray-300 rounded"></div>
            
            <div className={`flex items-center ${result ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${result ? 'bg-green-100' : 'bg-gray-100'}`}>
                {result ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">3</span>
                )}
              </div>
              <span className="font-medium">Get Results</span>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl animate-shake">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setError('')}
                    className="inline-flex text-red-400 hover:text-red-600"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Section */}
          {!preview && !result && (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
              <UploadBox onFileSelect={handleFileSelect} isLoading={isLoading} />
              
              {/* Tips */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl mb-2">📸</div>
                  <h3 className="font-semibold text-green-800 mb-1">Clear Photo</h3>
                  <p className="text-sm text-green-600">Take a well-lit, focused image of the corn leaf</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl mb-2">🍃</div>
                  <h3 className="font-semibold text-blue-800 mb-1">Single Leaf</h3>
                  <p className="text-sm text-blue-600">Focus on one leaf showing disease symptoms</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl mb-2">⚡</div>
                  <h3 className="font-semibold text-purple-800 mb-1">Instant Results</h3>
                  <p className="text-sm text-purple-600">Get AI analysis in seconds</p>
                </div>
              </div>
            </div>
          )}

          {/* Preview without result */}
          {preview && !isLoading && !result && (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">📷 Image Preview</h3>
                  <button
                    onClick={resetDetection}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-xl overflow-hidden">
                  <img
                    src={preview}
                    alt="Preview"
                    className="object-contain w-full h-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="text-center py-12">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="h-16 w-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full animate-spin">
                      <div className="h-4 w-4 bg-white rounded-full absolute top-1 left-1"></div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">🤖 AI Analysis in Progress</h3>
                <p className="text-gray-600 mb-4">{t('detect.analyzing')}</p>
                <div className="w-64 mx-auto bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image Display */}
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">📷 Analyzed Image</h3>
                      <button
                        onClick={resetDetection}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg transition-colors flex items-center"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        New Analysis
                      </button>
                    </div>
                    <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-xl overflow-hidden">
                      <img
                        src={preview}
                        alt="Analyzed"
                        className="object-contain w-full h-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Results Card */}
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20">
                  <ResultCard {...result} />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🚀 Next Steps</h3>
                
                {expertSubmitted && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-green-800 font-medium">Expert consultation request submitted successfully!</span>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <button
                    onClick={resetDetection}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center justify-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    🔍 Analyze Another
                  </button>
                  
                  {detectionId && (
                    <button
                      onClick={handleDownloadPDF}
                      className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center justify-center"
                    >
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      � Download PDF
                    </button>
                  )}
                  
                  <button
                    onClick={handleExpertConsultation}
                    disabled={expertSubmitted}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center justify-center disabled:opacity-50 disabled:transform-none"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {expertSubmitted ? '✓ Expert Asked' : '👨‍⚕️ Ask Expert'}
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center justify-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    📊 View Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Expert Consultation Modal */}
      {showExpertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">👨‍⚕️ Ask Expert</h3>
                <button
                  onClick={() => setShowExpertModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Disease Detected:</strong> {result?.disease_name}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Confidence:</strong> {result ? (result.confidence * 100).toFixed(1) : 0}%
                </p>
              </div>
              
              <div className="mb-6">
                <label htmlFor="expertMessage" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Question for the Expert:
                </label>
                <textarea
                  id="expertMessage"
                  value={expertMessage}
                  onChange={(e) => setExpertMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Describe your concerns or ask specific questions about this detection..."
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowExpertModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={submitExpertRequest}
                  disabled={!expertMessage.trim() || isSubmittingExpert}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmittingExpert ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Detect;
