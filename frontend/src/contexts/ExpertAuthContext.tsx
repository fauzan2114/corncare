import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

export interface Expert {
  id: string;
  name: string;
  email: string;
  specialization: string;
  experience: number;
  qualification?: string;
  university?: string;
  current_position?: string;
  organization?: string;
  bio?: string;
}

interface ExpertAuthContextType {
  expert: Expert | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const ExpertAuthContext = createContext<ExpertAuthContextType>({
  expert: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

// Create axios instance for expert API calls
export const expertAPI = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add token
expertAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('expert_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token expiration
expertAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('expert_token');
      localStorage.removeItem('expert_user');
      window.location.href = '/expert-login';
    }
    return Promise.reject(error);
  }
);

// Expert API functions
export const expertLogin = async (username: string, password: string) => {
  const response = await expertAPI.post('/expert-auth/login', { username, password });
  return response.data;
};

export const expertRegister = async (expertData: {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experience: number;
  qualification: string;
  university: string;
  current_position: string;
  organization: string;
  bio: string;
}, resumeFile: File) => {
  const formData = new FormData();
  Object.entries(expertData).forEach(([key, value]) => {
    formData.append(key, value.toString());
  });
  formData.append('resume_file', resumeFile);
  
  const response = await expertAPI.post('/expert-auth/register', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getExpertProfile = async () => {
  const response = await expertAPI.get('/expert-auth/me');
  return response.data;
};

// Dashboard API functions
export const getPendingRequests = async () => {
  const response = await expertAPI.get('/expert-dashboard/pending-requests');
  return response.data;
};

export const getMyRequests = async () => {
  const response = await expertAPI.get('/expert-dashboard/my-requests');
  return response.data;
};

export const assignRequest = async (requestId: string) => {
  const response = await expertAPI.post(`/expert-dashboard/requests/${requestId}/assign`);
  return response.data;
};

export const respondToRequest = async (requestId: string, response: string) => {
  const formData = new FormData();
  formData.append('response', response);
  
  const apiResponse = await expertAPI.post(`/expert-dashboard/requests/${requestId}/respond`, formData);
  return apiResponse.data;
};

export const getExpertStats = async () => {
  const response = await expertAPI.get('/expert-dashboard/stats');
  return response.data;
};

export const downloadRequestPDF = async (requestId: string) => {
  const response = await expertAPI.get(`/expert-dashboard/requests/${requestId}/pdf`, {
    responseType: 'blob'
  });
  return response.data;
};

interface ExpertAuthProviderProps {
  children: ReactNode;
}

export const ExpertAuthProvider: React.FC<ExpertAuthProviderProps> = ({ children }) => {
  const [expert, setExpert] = useState<Expert | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('expert_token');
    const savedExpert = localStorage.getItem('expert_user');
    
    if (token && savedExpert) {
      try {
        setExpert(JSON.parse(savedExpert));
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('expert_token');
        localStorage.removeItem('expert_user');
      }
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await expertLogin(username, password);
      const { access_token, expert } = response;
      
      localStorage.setItem('expert_token', access_token);
      localStorage.setItem('expert_user', JSON.stringify(expert));
      
      setExpert(expert);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('expert_token');
    localStorage.removeItem('expert_user');
    setExpert(null);
    setIsAuthenticated(false);
  };

  const value: ExpertAuthContextType = {
    expert,
    login,
    logout,
    isAuthenticated,
  };

  return (
    <ExpertAuthContext.Provider value={value}>
      {children}
    </ExpertAuthContext.Provider>
  );
};

export const useExpertAuth = () => {
  const context = useContext(ExpertAuthContext);
  if (!context) {
    throw new Error('useExpertAuth must be used within ExpertAuthProvider');
  }
  return context;
};