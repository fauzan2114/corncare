import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../contexts/AuthContext';
import { createExpertRequest, getExpertRequests, ExpertRequest, startChatSession, getChatMessages } from '../lib/auth-api';
import UserChatPanel from '../components/UserChatPanel';
import ChatIcon from '../components/ChatIcon';

const ExpertConsultation: React.FC = () => {
  const { t } = useTranslation();
  useContext(AuthContext); // ensure auth context is initialized if needed
  const [requests, setRequests] = useState<ExpertRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    disease: '',
    message: ''
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [activeChat, setActiveChat] = useState<{id: string, disease: string} | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({});
  const [lastMessageCounts, setLastMessageCounts] = useState<{[key: string]: number}>({});
  const [openChatId, setOpenChatId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await getExpertRequests();
        setRequests(data);
        
        // Initialize message counts for each request
        const initialCounts: {[key: string]: number} = {};
        for (const request of data) {
          try {
            const { getChatMessages } = await import('../lib/auth-api');
            const messages = await getChatMessages(request.id);
            const expertMessages = messages.filter(m => m.sender === 'expert');
            initialCounts[request.id] = expertMessages.length;
          } catch (error) {
            initialCounts[request.id] = 0;
          }
        }
        setLastMessageCounts(initialCounts);
      } catch (error) {
        console.error('Failed to fetch expert requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
    
    // Poll for new messages every 5 seconds
    const pollInterval = setInterval(checkForNewMessages, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createExpertRequest(formData.disease, formData.message, pdfFile || undefined);
      // Refresh the requests list
      const data = await getExpertRequests();
      setRequests(data);
      
      // Reset form
      setFormData({ disease: '', message: '' });
      setPdfFile(null);
      setShowForm(false);
      
      alert('Expert consultation request submitted successfully!');
    } catch (error) {
      console.error('Failed to submit request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const checkForNewMessages = async () => {
    try {
      const data = await getExpertRequests();
      const { getUnreadCount } = await import('../lib/auth-api');
      // For each request, ask server for unread count (skip open chat)
      for (const request of data) {
        if (openChatId === request.id) continue;
        try {
          const unread = await getUnreadCount(request.id);
          setUnreadCounts(prev => ({ ...prev, [request.id]: unread }));
        } catch (error) {
          console.debug('Could not fetch unread count for request:', request.id);
        }
      }
    } catch (error) {
      console.error('Failed to check for new messages:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openChat = async (requestId: string, disease: string) => {
    try {
      await startChatSession(requestId);
      const { markChatRead } = await import('../lib/auth-api');
      await markChatRead(requestId);
    } catch (error) {
      console.debug('Error in openChat:', error);
    }
    // Clear unread count and open
    setUnreadCounts(prev => ({ ...prev, [requestId]: 0 }));
    setOpenChatId(requestId);
    setActiveChat({ id: requestId, disease });
    setShowChat(true);
  };

  const markMessagesAsRead = async (requestId: string) => {
    try {
      // Get current message count to mark all as read
      const messages = await getChatMessages(requestId);
      const expertMessages = messages.filter(m => m.sender === 'expert');
      const currentExpertMessageCount = expertMessages.length;
      
      // Update last known count to current count (mark all as read)
      setLastMessageCounts(prev => ({
        ...prev,
        [requestId]: currentExpertMessageCount
      }));
      
      // Also clear unread count
      setUnreadCounts(prev => ({ ...prev, [requestId]: 0 }));
    } catch (error) {
      console.debug('Error marking messages as read:', error);
    }
  };

  const handleNewMessage = (requestId: string) => {
    // If the chat is open, treat as read and keep unread at 0
    if (openChatId === requestId) {
      setLastMessageCounts(prev => ({
        ...prev,
        [requestId]: (prev[requestId] || 0) + 1,
      }));
      setUnreadCounts(prev => ({
        ...prev,
        [requestId]: 0,
      }));
      return;
    }

    // Otherwise increment unread count for that chat
    setUnreadCounts(prev => ({
      ...prev,
      [requestId]: (prev[requestId] || 0) + 1,
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 text-center">
          <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="text-xl font-semibold text-gray-900">{t('consultation.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Header */}
      <div className="relative bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">🌽</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  Expert Consultation
                </h1>
                <p className="text-gray-600 text-sm">Get professional advice from agricultural experts</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* New Request Button */}
        <div className="mb-8">
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-blue-700 hover:to-purple-700 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-semibold"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              🩺 New Consultation Request
            </button>
          )}
        </div>

        {/* Request Form */}
        {showForm && (
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 mb-8">
            <div className="p-8 md:p-10">
              <div className="flex items-center mb-6">
                <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-4">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Submit Expert Consultation Request
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="disease" className="block text-sm font-medium text-gray-700 mb-2">
                    Disease/Condition
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="disease"
                      required
                      value={formData.disease}
                      onChange={(e) => setFormData({...formData, disease: e.target.value})}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., Common Rust, Northern Corn Leaf Blight, etc."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message/Question
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <textarea
                      id="message"
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                      placeholder="Describe your concern, symptoms observed, treatment questions, environmental conditions, etc."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pdf-upload" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload PDF Report (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 bg-white/30 backdrop-blur-sm hover:border-blue-300 transition-colors duration-200">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div className="mt-4">
                        <input
                          type="file"
                          id="pdf-upload"
                          accept=".pdf"
                          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label
                          htmlFor="pdf-upload"
                          className="cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
                        >
                          Choose PDF File
                        </label>
                        {pdfFile && (
                          <div className="mt-2 flex items-center justify-center text-green-600">
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-medium">{pdfFile.name}</span>
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Upload the detection report PDF to help experts understand your case better
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span>Submit Request</span>
                        <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ disease: '', message: '' });
                      setPdfFile(null);
                    }}
                    className="bg-white/50 backdrop-blur-sm text-gray-700 py-3 px-6 rounded-xl font-semibold border border-gray-200 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Requests List */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 mb-8">
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Your Consultation Requests</h3>
                <p className="text-sm text-gray-600">Track your expert consultation requests and responses</p>
              </div>
            </div>
          </div>
          
          {requests.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No consultation requests yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Submit your first expert consultation request to get professional advice from agricultural specialists.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold"
              >
                Submit Request
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {requests.map((request) => (
                <div key={request.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="text-xl font-bold text-white">{request.disease.charAt(0)}</span>
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-gray-800">
                              {request.disease}
                            </h4>
                            <p className="text-sm text-gray-500">Expert Consultation</p>
                          </div>
                        </div>
                        <div className={`px-4 py-2 text-xs font-bold rounded-2xl shadow-sm ${getStatusColor(request.status)}`}>
                          {request.status === 'pending' && '🕐 PENDING'}
                          {request.status === 'in_progress' && '🔄 IN PROGRESS'}
                          {request.status === 'resolved' && '✅ RESOLVED'}
                        </div>
                      </div>
                      
                      <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">💭</span>
                          <span className="font-semibold text-gray-900">Your Question</span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{request.message}</p>
                      </div>
                      
                      {request.response && (
                        <div className="mb-4 p-4 bg-green-50 rounded-xl border-l-4 border-green-400">
                          <p className="text-sm text-green-700">
                            <span className="font-semibold text-green-900">Expert Response:</span>
                          </p>
                          <p className="text-green-800 mt-1">{request.response}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Submitted on {formatDate(request.created_at)}</span>
                        <ChatIcon
                          onClick={() => openChat(request.id, request.disease)}
                          unreadCount={unreadCounts[request.id] || 0}
                          color="green"
                          title="Open Chat with Expert"
                          className="ml-3"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">🩺 Expert Consultation Service</h3>
              <div className="text-sm text-blue-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Submit detailed questions about corn diseases
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Expert agricultural specialists review requests
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Typical response time: 24-48 hours
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Include symptoms and treatment history
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {showChat && activeChat && (
        <UserChatPanel 
          requestId={activeChat.id} 
          disease={activeChat.disease} 
          onClose={() => {
            setShowChat(false);
            setOpenChatId(null);
          }} 
          onNewMessage={() => handleNewMessage(activeChat.id)}
          setOpenChatId={setOpenChatId}
          onMarkAsRead={markMessagesAsRead}
        />
      )}
    </div>
  );
};

export default ExpertConsultation;