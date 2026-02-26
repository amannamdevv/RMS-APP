import axios from 'axios';

// ─── Base URL ────────────────────────────────────────────────────────────────
// Change this to your Django server URL if different
export const BASE_URL = 'https://rms.shrotitele.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true, // send cookies (session auth)
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  status: 'success' | 'error';
  message: string;
  redirect_url?: string;
  skip_otp?: boolean;
  whatsapp_url?: string;
  fullname?: string;
}

export interface OtpResponse {
  status: 'success' | 'error';
  message: string;
  redirect_url?: string;
}

export interface MeResponse {
  status: 'success' | 'error';
  user_id?: string;
  username?: string;
  fullname?: string;
  role?: string;
  ptye?: number;
  login_time?: string;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

/**
 * Step 1: Validate credentials.
 * POST /api/auth/login/
 */
export async function loginApi(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/auth/login/', {
    username,
    password,
  });
  return data;
}

/**
 * Step 2: Verify WhatsApp OTP.
 * POST /api/auth/verify-otp/
 */
export async function verifyOtpApi(otp: string): Promise<OtpResponse> {
  const { data } = await api.post<OtpResponse>('/api/auth/verify-otp/', {
    otp,
  });
  return data;
}

/**
 * Logout current user.
 * POST /api/auth/logout/
 */
export async function logoutApi(): Promise<void> {
  await api.post('/api/auth/logout/');
}

/**
 * Get current session user info.
 * GET /api/auth/me/
 */
export async function meApi(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/api/auth/me/');
  return data;
}

export default api;
