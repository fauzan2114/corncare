import axios from 'axios';

// VITE_API_BASE can be a single URL or a comma-separated list (dev convenience).
// Normalize and pick the first valid URL; fallback to localhost.
const rawApiBase: string = import.meta.env.VITE_API_BASE || '';
let API_BASE = 'http://localhost:8000';
if (rawApiBase && rawApiBase.length > 0) {
  // Keep it simple and robust: pick the first comma-separated token
  const first = rawApiBase.split(',')[0].trim();
  if (first.length > 0) {
    API_BASE = first;
  }
}

// Debug: print resolved API base during development to help track invalid URL issues
try {
  // eslint-disable-next-line no-console
  console.debug('[api] Resolved API_BASE =', API_BASE);
} catch (e) {}

export interface PredictionResponse {
  label: string;
  disease_name?: string;
  confidence: number;
  cure: string;
  tips: string;
}

export const predictDisease = async (file: File): Promise<PredictionResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const fullUrl = `${API_BASE.replace(/\/+$/,'')}/predict`;
    // Debug: show the full URL used for the request
    // eslint-disable-next-line no-console
    console.debug('[api] POST', fullUrl);
    const response = await axios.post<PredictionResponse>(fullUrl, formData);

    return response.data;
  } catch (err: any) {
    // Build a clearer error message for the UI
    const serverMessage = err?.response?.data || err?.message || String(err);
    console.error('predictDisease error:', serverMessage);
    throw new Error(typeof serverMessage === 'string' ? serverMessage : JSON.stringify(serverMessage));
  }
};
