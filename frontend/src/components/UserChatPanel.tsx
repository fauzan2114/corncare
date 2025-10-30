import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getChatSession, getChatMessages, sendChatMessage, ChatMessage } from '../lib/auth-api';

interface UserChatProps {
  requestId: string;
  disease: string;
  onClose: () => void;
  onNewMessage?: () => void; // Callback for new messages
  setOpenChatId?: React.Dispatch<React.SetStateAction<string | null>>;
  onMarkAsRead?: (requestId: string) => void; // Callback to mark messages as read
}

const UserChatPanel: React.FC<UserChatProps> = ({ requestId, disease, onClose, onNewMessage, setOpenChatId, onMarkAsRead }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiWrapperRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    const init = async () => {
      try {
        const session = await getChatSession(requestId);
        setMessages(session.messages || []);
      } catch (e) {
        try {
          const msgs = await getChatMessages(requestId);
          setMessages(msgs);
        } catch {}
      }
    };
    init();

    const interval = setInterval(async () => {
      try {
        const latest = await getChatMessages(requestId);
        setMessages(prevMessages => {
          // Check for new expert messages
          const expertMessages = latest.filter(m => m.sender === 'expert');
          const prevExpertMessages = prevMessages.filter(m => m.sender === 'expert');
          
          if (expertMessages.length > prevExpertMessages.length && onNewMessage) {
            onNewMessage(); // Trigger notification
          }
          
          return latest;
        });
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [requestId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!(newMessage && newMessage.trim()) && !file) || sending) return;
    setSending(true);
    try {
      const msg = await sendChatMessage(requestId, newMessage, file || undefined);
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      setFile(null);
      setShowEmoji(false);
    } catch (e) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="fixed inset-0 bg-black/50 md:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl md:max-w-6xl h-[88vh] md:h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center text-xl">🩺</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">Expert Chat</h3>
                  <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-xs text-gray-500">Topic: {disease}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">💬</span>
              </div>
              <h4 className="text-base font-semibold text-gray-800 mb-1">{t('chat.empty.user.title')}</h4>
              <p className="text-sm text-gray-500">{t('chat.empty.user.description')}</p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const prev = messages[idx - 1];
              const showDate = !prev || new Date(prev.timestamp).toDateString() !== new Date(m.timestamp).toDateString();
              const isMe = m.sender === 'user';
              return (
                <React.Fragment key={m.id}>
                  {showDate && (
                    <div className="flex items-center my-3">
                      <div className="flex-1 border-t border-gray-200" />
                      <span className="mx-3 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{formatDate(m.timestamp)}</span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>
                  )}
                  <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm">👨‍⚕️</div>
                    )}
                    <div className={`max-w-[75%] ${isMe ? 'order-last' : ''}`}>
                      <div className={`px-4 py-3 rounded-2xl shadow-sm ${isMe ? 'bg-emerald-600 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'}`}>
                        {m.file_url ? (
                          <div className="space-y-2">
                            {m.file_mime && m.file_mime.startsWith('image/') ? (
                              <a href={m.file_url} target="_blank" rel="noreferrer" className="block group">
                                <img src={m.file_url} alt={m.file_name || 'attachment'} className="max-w-full rounded-lg border border-gray-200 group-hover:opacity-95 transition" />
                              </a>
                            ) : (
                              <div className={`p-2 rounded-lg ${isMe ? 'bg-emerald-500/20 text-white' : 'bg-gray-50 text-gray-800'} flex items-center gap-2`}>
                                <span className="text-lg">📎</span>
                                <a href={m.file_url} target="_blank" rel="noreferrer" className={`text-sm font-medium ${isMe ? 'underline' : 'text-blue-600 hover:text-blue-800'}`}>
                                  {m.file_name || 'Download attachment'}
                                </a>
                              </div>
                            )}
                            {m.message && <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>}
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
                        )}
                      </div>
                      <p className={`text-[11px] mt-1 ${isMe ? 'text-right text-gray-400' : 'text-gray-400'}`}>{formatTime(m.timestamp)}</p>
                    </div>
                    {isMe && (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">👤</div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-100 p-4 md:p-5">
          <form onSubmit={handleSend} className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('chat.placeholder')}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-500"
                  disabled={sending}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="relative" ref={emojiWrapperRef}>
                  <button 
                    type="button" 
                    aria-label="Insert emoji" 
                    onClick={() => setShowEmoji(v => !v)} 
                    className="w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all duration-200 text-xl"
                  >
                    😊
                  </button>
                  {showEmoji && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white border rounded-xl shadow-xl p-3 w-64 grid grid-cols-6 gap-2 z-50">
                      {['😀','😁','😂','🤣','😊','😍','😘','😎','🤔','😴','👍','🙏','💡','✅','❗','❓','🔥','✨','🍀','🌽','📌','🧪','🛠️','🩺','📄','📷'].map(em => (
                        <button 
                          key={em} 
                          type="button" 
                          className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition-colors" 
                          onClick={() => setNewMessage(prev => (prev || '') + em)}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <label className="w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200" title="Attach file">
                  <span className="text-xl">📎</span>
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
                
                <button 
                  type="submit" 
                  disabled={(!(newMessage && newMessage.trim()) && !file) || sending} 
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 shadow-sm"
                >
                  {sending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send</span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {file && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-blue-600">📎</span>
                <span className="text-sm text-blue-800 font-medium truncate">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} className="text-blue-600 hover:text-blue-800" aria-label="Remove attachment">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            <p className="text-[11px] text-gray-500 text-center">💡 {t('chat.disclaimer')}</p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserChatPanel;
