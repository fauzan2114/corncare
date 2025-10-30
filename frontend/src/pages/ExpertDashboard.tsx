import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { ExpertAuthContext, getPendingRequests, getMyRequests, assignRequest, respondToRequest, getExpertStats, downloadRequestPDF } from '../contexts/ExpertAuthContext';
import ExpertChatPanel from '../components/ExpertChatPanel';
import ChatIcon from '../components/ChatIcon';

interface ConsultationRequest {
  id: string;
  user_id: string;
  user_name: string;
  disease: string;
  message: string;
  pdf_path?: string;
  status: string;
  response?: string;
  created_at: string;
  updated_at?: string;
}

interface Stats {
  pending_requests: number;
  my_in_progress: number;
  my_resolved: number;
  total_handled: number;
}

const ExpertDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { expert, logout } = useContext(ExpertAuthContext);
  const [activeTab, setActiveTab] = useState<'pending' | 'assigned' | 'stats'>('pending');
  const [pendingRequests, setPendingRequests] = useState<ConsultationRequest[]>([]);
  const [myRequests, setMyRequests] = useState<ConsultationRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending_requests: 0,
    my_in_progress: 0,
    my_resolved: 0,
    total_handled: 0
  });
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState<{[key: string]: string}>({});
  const [submittingResponse, setSubmittingResponse] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [selectedChatRequest, setSelectedChatRequest] = useState<ConsultationRequest | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({});
  const [lastMessageCounts, setLastMessageCounts] = useState<{[key: string]: number}>({});
  const [openChatId, setOpenChatId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    
    // Poll for new messages every 5 seconds to update unread counts
    const pollInterval = setInterval(checkForNewMessages, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  const fetchData = async () => {
    try {
      const [pendingData, myData, statsData] = await Promise.all([
        getPendingRequests(),
        getMyRequests(),
        getExpertStats()
      ]);
      setPendingRequests(pendingData);
      setMyRequests(myData);
      setStats(statsData);
      
      // No local baseline needed; unread counts now come from server
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRequest = async (requestId: string) => {
    try {
      await assignRequest(requestId);
      fetchData(); // Refresh data
      alert(t('expert.dashboard.alerts.assignSuccess'));
    } catch (error) {
      console.error('Failed to assign request:', error);
      alert(t('expert.dashboard.alerts.assignError'));
    }
  };

  const handleSubmitResponse = async (requestId: string) => {
    const response = responseText[requestId];
    if (!response?.trim()) {
      alert(t('expert.dashboard.alerts.responseRequired'));
      return;
    }

    setSubmittingResponse(requestId);
    try {
      await respondToRequest(requestId, response);
      setResponseText({ ...responseText, [requestId]: '' });
      fetchData(); // Refresh data
      alert(t('expert.dashboard.alerts.responseSuccess'));
    } catch (error) {
      console.error('Failed to submit response:', error);
      alert(t('expert.dashboard.alerts.responseError'));
    } finally {
      setSubmittingResponse(null);
    }
  };

  const handleDownloadPDF = async (requestId: string) => {
    try {
      const blob = await downloadRequestPDF(requestId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `consultation_${requestId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert(t('expert.dashboard.alerts.pdfError'));
    }
  };

  const checkForNewMessages = async () => {
    try {
      // Get all my requests (both pending and in-progress)
      const [pendingData, myData] = await Promise.all([
        getPendingRequests(),
        getMyRequests()
      ]);
      
      const allRequests = [...pendingData, ...myData];
      
      // Check each request for unread count from server (skip open chat)
      const { getUnreadCount } = await import('../lib/auth-api');
      for (const request of allRequests) {
        if (openChatId === request.id) continue;
        try {
          const unread = await getUnreadCount(request.id);
          setUnreadCounts(prev => ({ ...prev, [request.id]: unread }));
          // Keep a baseline when unread is 0 by syncing with total messages for fallback
          if (unread === 0) {
            try {
              const { getExpertChatMessages } = await import('../lib/auth-api');
              const messages = await getExpertChatMessages(request.id);
              const userMessages = messages.filter(m => m.sender === 'user');
              setLastMessageCounts(prev => ({ ...prev, [request.id]: userMessages.length }));
            } catch {}
          }
        } catch (error) {
          // Fallback: client-side unread using delta from last known counts
          try {
            const { getExpertChatMessages } = await import('../lib/auth-api');
            const messages = await getExpertChatMessages(request.id);
            const userMessages = messages.filter(m => m.sender === 'user');
            const currentCount = userMessages.length;
            const lastKnown = lastMessageCounts[request.id] || 0;
            const unread = Math.max(0, currentCount - lastKnown);
            setUnreadCounts(prev => ({ ...prev, [request.id]: unread }));
            // Update baseline to current to avoid accumulation
            setLastMessageCounts(prev => ({ ...prev, [request.id]: currentCount }));
          } catch (e) {
            console.debug('Fallback unread calc failed for request:', request.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check for new messages:', error);
    }
  };

  const handleStartChat = async (request: ConsultationRequest) => {
    // Mark as read on server and clear local badge
    try {
      const { markChatRead } = await import('../lib/auth-api');
      await markChatRead(request.id);
    } catch {}
    setUnreadCounts(prev => ({ ...prev, [request.id]: 0 }));
    setOpenChatId(request.id);
    setSelectedChatRequest(request);
    setShowChat(true);
  };

  // No-op retained for compatibility; server-side read receipt handles counts
  const markMessagesAsRead = async (requestId: string) => {
    try {
      const { markChatRead } = await import('../lib/auth-api');
      await markChatRead(requestId);
      setUnreadCounts(prev => ({ ...prev, [requestId]: 0 }));
    } catch {}
  };

  const handleCloseChat = () => {
    // If a chat is selected, mark it as read before closing and zero unread immediately
    if (selectedChatRequest) {
      setUnreadCounts(prev => ({ ...prev, [selectedChatRequest.id]: 0 }));
      // Mark as read on server to persist state across polls
      (async () => {
        try {
          const { markChatRead } = await import('../lib/auth-api');
          await markChatRead(selectedChatRequest.id);
        } catch {}
      })();
    }
    setShowChat(false);
    setSelectedChatRequest(null);
    setOpenChatId(null);
  };

  const handleNewMessage = (requestId: string) => {
    // If the chat is open, keep unread at 0 and let server handle baseline
    if (openChatId === requestId) {
      setUnreadCounts(prev => ({ ...prev, [requestId]: 0 }));
      return;
    }

    // If the chat is not open, increment unread count for that chat
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
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-12 text-center">
          <div className="h-16 w-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🌽</span>
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-900">Loading Expert Dashboard...</p>
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

      {/* Navigation Tabs */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">🌽</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  {t('expert.dashboard.title')}
                </h1>
                <p className="text-sm text-gray-600">{t('expert.dashboard.welcome')}, <span className="font-semibold text-green-600">Dr. {expert?.name}</span> • {t('expert.dashboard.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-xl hover:from-red-600 hover:to-red-700 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              🚪 {t('expert.dashboard.logout')}
            </button>
          </div>
        </div>

        {/* Modern Tab Navigation */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 mb-8">
          <nav className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === 'pending'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              🕐 {t('expert.dashboard.tabs.pending')} ({stats.pending_requests})
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === 'assigned'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              📋 {t('expert.dashboard.tabs.assigned')} ({myRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === 'stats'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              📊 {t('expert.dashboard.tabs.stats')}
            </button>
          </nav>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Pending Requests Tab */}
          {activeTab === 'pending' && (
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
              <div className="p-6 border-b border-gray-200/50">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{t('expert.dashboard.pending.title')}</h3>
                    <p className="text-sm text-gray-600">{t('expert.dashboard.pending.subtitle')}</p>
                  </div>
                </div>
              </div>
              
              {pendingRequests.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('expert.dashboard.pending.empty.title')}</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    {t('expert.dashboard.pending.empty.description')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="p-6 hover:bg-white/50 transition-colors duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-bold text-white">{request.disease.charAt(0)}</span>
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-blue-600">{request.disease}</h4>
                                <p className="text-sm text-gray-600">Patient: {request.user_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {request.pdf_path && (
                                <button
                                  onClick={() => handleDownloadPDF(request.id)}
                                  className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors duration-200"
                                >
                                  📄 PDF
                                </button>
                              )}
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                🕐 {t('expert.dashboard.pending.pending')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 rounded-2xl p-4 border-l-4 border-blue-400 mb-4">
                            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{request.message}</p>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-xs text-gray-500">
                              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {t('expert.dashboard.pending.submittedOn')} {formatDate(request.created_at)}
                            </div>
                            
                            <button
                              onClick={() => handleAssignRequest(request.id)}
                              className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-2 rounded-xl hover:from-green-700 hover:to-blue-700 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                              ✋ {t('expert.dashboard.pending.assignToMe')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Requests Tab */}
          {activeTab === 'assigned' && (
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
              <div className="p-6 border-b border-gray-200/50">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-4">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">My Assigned Requests</h3>
                    <p className="text-sm text-gray-600">Consultation requests assigned to you</p>
                  </div>
                </div>
              </div>
              
              {myRequests.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No assigned requests</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    You haven't been assigned any consultation requests yet. Check the pending requests tab to assign yourself to new cases.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myRequests.map((request) => (
                    <div key={request.id} className="p-6 hover:bg-white/50 transition-colors duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-bold text-white">{request.disease.charAt(0)}</span>
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-indigo-600">{request.disease}</h4>
                                <p className="text-sm text-gray-600">Patient: {request.user_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {request.pdf_path && (
                                <button
                                  onClick={() => handleDownloadPDF(request.id)}
                                  className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors duration-200"
                                >
                                  📄 PDF
                                </button>
                              )}
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {request.status === 'pending' && '🕐 PENDING'}
                                {request.status === 'in_progress' && '🔄 IN PROGRESS'}
                                {request.status === 'resolved' && '✅ RESOLVED'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 rounded-2xl p-4 border-l-4 border-blue-400 mb-6">
                            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{request.message}</p>
                          </div>
                          
                          {request.status === 'resolved' ? (
                            <div className="space-y-4">
                              <div className="bg-green-50 rounded-2xl p-6 border-l-4 border-green-400">
                                <div className="flex items-center mb-3">
                                  <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center mr-2">
                                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <h4 className="font-bold text-green-900">Your Expert Response:</h4>
                                </div>
                                <p className="text-green-800 whitespace-pre-wrap leading-relaxed">{request.response}</p>
                              </div>
                              <ChatIcon
                                onClick={() => handleStartChat(request)}
                                unreadCount={unreadCounts[request.id] || 0}
                                color="green"
                                title="Continue Chat with Patient"
                              />
                            </div>
                          ) : (
                            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
                              <div className="flex items-center mb-4">
                                <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </div>
                                <h4 className="font-bold text-gray-900">Provide Expert Response:</h4>
                              </div>
                              <textarea
                                rows={5}
                                value={responseText[request.id] || ''}
                                onChange={(e) => setResponseText({
                                  ...responseText,
                                  [request.id]: e.target.value
                                })}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                                placeholder="Enter your expert advice, diagnosis, treatment recommendations, and preventive measures..."
                              />
                              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                <button
                                  onClick={() => handleSubmitResponse(request.id)}
                                  disabled={submittingResponse === request.id}
                                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {submittingResponse === request.id ? (
                                    <div className="flex items-center justify-center">
                                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Submitting...
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center">
                                      <span>Submit Response</span>
                                      <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                      </svg>
                                    </div>
                                  )}
                                </button>
                                <div className="relative inline-block">
                                  <ChatIcon
                                    onClick={() => handleStartChat(request)}
                                    unreadCount={unreadCounts[request.id] || 0}
                                    color="blue"
                                    title="Start Chat"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center text-xs text-gray-500 mt-4">
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Submitted on {formatDate(request.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-8">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-4">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard Statistics</h2>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="text-3xl font-bold text-blue-600">{stats.pending_requests}</div>
                      <div className="text-sm font-medium text-gray-600">Pending Requests</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="text-3xl font-bold text-yellow-600">{stats.my_in_progress}</div>
                      <div className="text-sm font-medium text-gray-600">In Progress</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="text-3xl font-bold text-green-600">{stats.my_resolved}</div>
                      <div className="text-sm font-medium text-gray-600">Resolved by Me</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="text-3xl font-bold text-purple-600">{stats.total_handled}</div>
                      <div className="text-sm font-medium text-gray-600">Total Handled</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Expert Profile */}
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8">
                <div className="flex items-center mb-6">
                  <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">👨‍⚕️ Expert Profile</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-1">Full Name</h4>
                      <p className="text-lg font-medium text-gray-900">Dr. {expert?.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-1">Email</h4>
                      <p className="text-lg font-medium text-gray-900">{expert?.email}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-1">Specialization</h4>
                      <p className="text-lg font-medium text-gray-900">{expert?.specialization}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-1">Experience</h4>
                      <p className="text-lg font-medium text-gray-900">{expert?.experience} years</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-1">Qualification</h4>
                      <p className="text-lg font-medium text-gray-900">{expert?.qualification}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-1">University</h4>
                      <p className="text-lg font-medium text-gray-900">{expert?.university}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-1">Current Position</h4>
                      <p className="text-lg font-medium text-gray-900">{expert?.current_position}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-1">Organization</h4>
                      <p className="text-lg font-medium text-gray-900">{expert?.organization}</p>
                    </div>
                  </div>
                </div>
                
                {expert?.bio && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Bio</h4>
                    <p className="text-gray-800 leading-relaxed">{expert.bio}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && selectedChatRequest && (
        <ExpertChatPanel
          requestId={selectedChatRequest.id}
          disease={selectedChatRequest.disease}
          userName={selectedChatRequest.user_name}
          onClose={handleCloseChat}
          onNewMessage={() => handleNewMessage(selectedChatRequest.id)}
          setOpenChatId={setOpenChatId}
          onMarkAsRead={markMessagesAsRead}
        />
      )}
    </div>
  );
};

export default ExpertDashboard;