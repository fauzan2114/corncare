import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getExpertChatSession, sendExpertChatMessage, getExpertChatMessages, ChatMessage } from '../lib/auth-api';

interface ExpertChatProps {
  requestId: string;
  disease: string;
  userName: string;
  onClose: () => void;
  onNewMessage?: () => void; // Callback for new messages
  setOpenChatId?: React.Dispatch<React.SetStateAction<string | null>>;
  onMarkAsRead?: (requestId: string) => void; // Callback to mark messages as read
}

const ExpertChat: React.FC<ExpertChatProps> = ({ requestId, disease, userName, onClose, onNewMessage, setOpenChatId, onMarkAsRead }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiWrapperRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!showEmoji) return;
      if (emojiWrapperRef.current && !emojiWrapperRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showEmoji]);

  useEffect(() => {
    const fetchChat = async () => {
      try {
        console.log('Expert fetching chat for request:', requestId);
        
        // Try to get the chat session first
        const session = await getExpertChatSession(requestId);
        console.log('Expert got session:', session);
        setMessages(session.messages || []);
      } catch (error) {
        console.error('Failed to fetch chat session:', error);
        
        // If session doesn't exist, try to get just messages
        try {
          console.log('Trying to get messages directly for request:', requestId);
          const messages = await getExpertChatMessages(requestId);
          console.log('Expert got messages:', messages);
          setMessages(messages);
        } catch (msgError) {
          console.error('Failed to fetch messages:', msgError);
          setMessages([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchChat();

    // Poll for new messages every 3 seconds
    const interval = setInterval(async () => {
      try {
        console.log('Expert polling for new messages for request:', requestId);
        const latestMessages = await getExpertChatMessages(requestId);
        console.log('Expert polled messages:', latestMessages);
        setMessages(prevMessages => {
          // Check for new user messages
          const userMessages = latestMessages.filter(m => m.sender === 'user');
          const prevUserMessages = prevMessages.filter(m => m.sender === 'user');
          
          if (userMessages.length > prevUserMessages.length && onNewMessage) {
            onNewMessage(); // Trigger notification
          }
          
          return latestMessages;
        });
      } catch (error) {
        console.error('Failed to fetch messages during polling:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [requestId]);

  // Set this chat as open when component mounts
  useEffect(() => {
    if (setOpenChatId) {
      setOpenChatId(requestId);
    }
    // Mark messages as read when chat opens
    if (onMarkAsRead) {
      onMarkAsRead(requestId);
    }
    // Clean up when component unmounts
    return () => {
      if (setOpenChatId) {
        setOpenChatId(null);
      }
    };
  }, [requestId, setOpenChatId, onMarkAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!(newMessage && newMessage.trim()) && !file) || sending) return;

    setSending(true);
    try {
  const message = await sendExpertChatMessage(requestId, newMessage, file || undefined);
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      setFile(null);
      setShowEmoji(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-emerald-600 mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xl font-semibold text-gray-700">{t('consultation.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to format date
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('chat.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('chat.yesterday');
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { [key: string]: ChatMessage[] }, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl md:max-w-6xl h-[88vh] md:h-[92vh] flex flex-col overflow-hidden">
        {/* Clean Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-semibold">👨‍⚕️</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('chat.title')}</h3>
              <p className="text-sm text-gray-500">{userName} • {disease}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-2 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h4 className="text-lg font-medium text-gray-700 mb-2">{t('chat.empty.expert.title')}</h4>
              <p className="text-gray-500">{t('chat.empty.expert.description')}</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date} className="mb-6">
                {/* Date Separator */}
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                    {formatDate(dateMessages[0].timestamp)}
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {dateMessages.map((message) => {
                    const isMe = message.sender === 'expert';
                    return (
                      <div key={message.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[75%]">
                          <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                            isMe 
                              ? 'bg-emerald-600 text-white rounded-br-md' 
                              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                          }`}>
                            {message.file_url ? (
                              <div className="space-y-2">
                                {message.file_mime && message.file_mime.startsWith('image/') ? (
                                  <a href={message.file_url} target="_blank" rel="noreferrer" className="block">
                                    <img 
                                      src={message.file_url} 
                                      alt={message.file_name || 'attachment'} 
                                      className="max-w-full rounded-lg" 
                                    />
                                  </a>
                                ) : (
                                  <div className={`p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-gray-100'} flex items-center space-x-2`}>
                                    <span className="text-sm">📄</span>
                                    <a 
                                      href={message.file_url} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className={`text-sm font-medium ${isMe ? 'text-white underline' : 'text-blue-600 hover:text-blue-800'}`}
                                    >
                                      {message.file_name || 'Download'}
                                    </a>
                                  </div>
                                )}
                                {message.message && <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>}
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
                            )}
                          </div>
                          <p className={`text-[11px] mt-1 ${isMe ? 'text-right text-gray-400' : 'text-gray-400'}`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                        {isMe && (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">👨‍⚕️</div>
                        )}
                        {!isMe && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm">👤</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Compact Input */}
        <div className="bg-white border-t border-gray-200 p-3">
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('chat.expertPlaceholder')}
                  className="w-full px-4 py-2 bg-gray-100 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  disabled={sending}
                />
              </div>
              
              <div className="flex items-center space-x-1">
                <div className="relative" ref={emojiWrapperRef}>
                  <button 
                    type="button" 
                    onClick={() => setShowEmoji(v => !v)} 
                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  >
                    😊
                  </button>
                  {showEmoji && (
                    <div className="absolute bottom-full right-0 mb-2 bg-white border rounded-xl shadow-lg p-2 w-64 grid grid-cols-8 gap-1 z-50">
                      {['😀','😁','😊','😍','🤔','','🙏','💡','✅','❗','🔥','✨','🍀','🌽','📌',''].map(em => (
                        <button 
                          key={em} 
                          type="button" 
                          className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors" 
                          onClick={() => setNewMessage(prev => (prev || '') + em)}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <label className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors">
                  📎
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
                
                <button 
                  type="submit" 
                  disabled={(!(newMessage && newMessage.trim()) && !file) || sending} 
                  className="w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  {sending ? (
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            {file && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 rounded-lg text-sm">
                <span>📎</span>
                <span className="text-emerald-800 font-medium truncate flex-1">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} className="text-emerald-600 hover:text-emerald-800">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpertChat;