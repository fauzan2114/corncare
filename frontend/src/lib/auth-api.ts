import axios from 'axios';

const rawApiBase: string = import.meta.env.VITE_API_BASE || '';
let API_BASE = 'http://localhost:8000';
if (rawApiBase && rawApiBase.length > 0) {
  const first = rawApiBase.split(',')[0].trim();
  if (first.length > 0) API_BASE = first;
}

// Debug: print the resolved API base (development only)
try {
  console.debug('[auth-api] Resolved API_BASE =', API_BASE);
} catch (e) {}

// Auth API
export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterPhoneData {
  name: string;
  phone_number: string;
}

export interface VerifyOTPData {
  phone_number: string;
  otp: string;
}

export interface CompleteRegistrationData {
  phone_number: string;
  username: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  phone_number: string;
  username: string;
  created_at: string;
}

export interface DetectionHistory {
  id: string;
  disease: string;
  disease_name: string;
  confidence: number;
  cure: string;
  tips: string;
  detected_at: string;
}

export interface ExpertRequest {
  id: string;
  disease: string;
  message: string;
  response?: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
}

export interface ChatMessage {
  id: string;
  request_id: string;
  sender: 'user' | 'expert';
  message: string;
  timestamp: string;
  file_url?: string;
  file_name?: string;
  file_mime?: string;
  file_size?: number;
}

export interface ChatSession {
  id: string;
  request_id: string;
  user_id: string;
  expert_id?: string;
  is_active: boolean;
  messages: ChatMessage[];
  created_at: string;
  updated_at?: string;
}

// Auth token management
let authToken: string | null = localStorage.getItem('authToken');

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('authToken', token);
};

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('authToken');
};

export const removeAuthToken = clearAuthToken;

export const getAuthToken = () => authToken;

// API instance with auth
const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  // Always read token from localStorage so the header is set even after a page
  // reload or when other modules import the api instance before setAuthToken()
  try {
    const token = localStorage.getItem('authToken');
    // IMPORTANT: don't overwrite Authorization if caller already set it
    if (token && !(config.headers && (config.headers as any).Authorization)) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // localStorage can throw in some uncommon environments — ignore and continue
    console.warn('auth-api: could not read authToken from localStorage', e);
  }
  // Debug: log the outgoing request URL and whether Authorization header exists
  try {
    // eslint-disable-next-line no-console
    console.debug('[auth-api] request', config.method, config.baseURL ? (config.baseURL + config.url) : config.url, 'Authorization=', Boolean(config.headers && (config.headers as any).Authorization));
  } catch (e) {}
  return config;
});

// Response interceptor: if backend returns 401, clear token to update UI and log event
api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    try {
      const status = error?.response?.status;
      if (status === 401) {
        // eslint-disable-next-line no-console
        console.warn('[auth-api] received 401 from API, clearing auth token');
        clearAuthToken();
      }
    } catch (e) {}
    return Promise.reject(error);
  }
);

// Auth endpoints
export const registerPhone = async (data: RegisterPhoneData) => {
  const response = await api.post('/auth/register/phone', data);
  return response.data;
};

export const verifyOTP = async (data: VerifyOTPData) => {
  const response = await api.post('/auth/verify-otp', data);
  return response.data;
};

export const completeRegistration = async (data: CompleteRegistrationData) => {
  const response = await api.post('/auth/register/complete', data);
  return response.data;
};

export const login = async (data: LoginData) => {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('password', data.password);
  
  const response = await api.post('/auth/token', formData);
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Disease prediction
export interface PredictionResponse {
  label: string;
  disease_name: string;
  confidence: number;
  cure: string;
  tips: string;
}

export const predictDisease = async (file: File): Promise<PredictionResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/predict', formData);
  return response.data;
};

// History endpoints
export const getHistory = async (): Promise<DetectionHistory[]> => {
  const response = await api.get('/history/');
  return response.data;
};

export const downloadHistoryPDF = async (historyId: string) => {
  const response = await api.get(`/history/${historyId}/pdf`, {
    responseType: 'blob',
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `detection_report_${historyId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const deleteHistoryRecord = async (historyId: string) => {
  const response = await api.delete(`/history/${historyId}`);
  return response.data;
};

// Expert consultation endpoints
export const createExpertRequest = async (disease: string, message: string, pdfFile?: File) => {
  const formData = new FormData();
  formData.append('disease', disease);
  formData.append('message', message);
  if (pdfFile) {
    formData.append('pdf_file', pdfFile);
  }
  
  const response = await api.post('/expert/request', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getExpertRequests = async (): Promise<ExpertRequest[]> => {
  const response = await api.get('/expert/requests');
  return response.data;
};

// Chat endpoints
export const startChatSession = async (requestId: string) => {
  const response = await api.post(`/expert/chat/${requestId}/start`);
  return response.data;
};

export const getChatSession = async (requestId: string): Promise<ChatSession> => {
  const response = await api.get(`/expert/chat/${requestId}`);
  return response.data;
};

export const sendChatMessage = async (requestId: string, message: string, file?: File): Promise<ChatMessage> => {
  const formData = new FormData();
  formData.append('message', message || '');
  if (file) formData.append('upload', file);
  
  const response = await api.post(`/expert/chat/${requestId}/message`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getChatMessages = async (requestId: string): Promise<ChatMessage[]> => {
  const response = await api.get(`/expert/chat/${requestId}/messages`);
  return response.data;
};

// Expert-side chat endpoints (using expert authentication)
export const getExpertChatSession = async (requestId: string): Promise<ChatSession> => {
  const expertToken = localStorage.getItem('expert_token');
  const response = await api.get(`/expert/chat/${requestId}`, {
    headers: expertToken ? { Authorization: `Bearer ${expertToken}` } : undefined,
  });
  return response.data;
};

export const sendExpertChatMessage = async (requestId: string, message: string, file?: File): Promise<ChatMessage> => {
  const formData = new FormData();
  formData.append('message', message || '');
  if (file) formData.append('upload', file);

  const expertToken = localStorage.getItem('expert_token');
  const response = await api.post(`/expert/chat/${requestId}/message`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(expertToken ? { Authorization: `Bearer ${expertToken}` } : {}),
    },
  });
  return response.data;
};

export const getExpertChatMessages = async (requestId: string): Promise<ChatMessage[]> => {
  const expertToken = localStorage.getItem('expert_token');
  const response = await api.get(`/expert/chat/${requestId}/messages`, {
    headers: expertToken ? { Authorization: `Bearer ${expertToken}` } : undefined,
  });
  return response.data;
};

// Read receipts: mark chat as read for current actor (user or expert)
export const markChatRead = async (requestId: string): Promise<void> => {
  const expertToken = localStorage.getItem('expert_token');
  const headers = expertToken ? { Authorization: `Bearer ${expertToken}` } : undefined;
  await api.post(`/expert/chat/${requestId}/read`, undefined, { headers });
};

// Unread count for current actor (user sees expert's messages, expert sees user's messages)
export const getUnreadCount = async (requestId: string): Promise<number> => {
  const expertToken = localStorage.getItem('expert_token');
  const headers = expertToken ? { Authorization: `Bearer ${expertToken}` } : undefined;
  const res = await api.get(`/expert/chat/${requestId}/unread_count`, { headers });
  return typeof res.data?.unread === 'number' ? res.data.unread : 0;
};