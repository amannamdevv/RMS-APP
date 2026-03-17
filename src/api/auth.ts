import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Backend URLs ──────────────────────────────────────────────────────────────
// const FASTAPI_AUTH_URL = 'http://192.168.1.40:8109/api/auth';
const DJANGO_AUTH_URL = 'http://rms.shrotitele.com/api/auth';

// ─── Storage keys ──────────────────────────────────────────────────────────────
const KEYS = {
  JWT_TOKEN: 'userToken',         // FastAPI Bearer token (Deprecated)
  DJANGO_SESSION: 'djangoSession',     // Django session cookie (active)
  DJANGO_SESSION_PENDING: 'djangoSessionPending', // Django session during OTP flow
};

// ─── Helper: extract sessionid from Set-Cookie response header ─────────────────
const extractSessionId = (headers: any): string | null => {
  const raw = headers['set-cookie'] ?? headers['Set-Cookie'];
  if (!raw) return null;
  const cookies = Array.isArray(raw) ? raw : [raw];
  for (const cookie of cookies) {
    const match = cookie.match(/sessionid=([^;]+)/);
    if (match) return match[1];
  }
  return null;
};

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
// Calls Django for primary authentication.
export const loginApi = async (username: string, password: string) => {
  /*
  // ── Primary call: FastAPI (drives the UI flow)
  const fastRes = await axios.post(`${FASTAPI_AUTH_URL}/login/`, { username, password });
  */

  // ── Call: Django (primary authentication) ──────────────
  const djangoRes = await axios.post(
    `${DJANGO_AUTH_URL}/login/`,
    { username, password },
  );

  const sessionId = extractSessionId(djangoRes.headers);
  if (sessionId) {
    // Store as "pending" — becomes active only after OTP is verified
    await AsyncStorage.setItem(KEYS.DJANGO_SESSION_PENDING, sessionId);
  }

  // If Django says skip_otp, promote session immediately
  if (djangoRes.data.status === 'success' && djangoRes.data.skip_otp) {
    if (sessionId) {
      await AsyncStorage.setItem(KEYS.DJANGO_SESSION, sessionId);
      await AsyncStorage.removeItem(KEYS.DJANGO_SESSION_PENDING);
    }
  }

  return djangoRes.data;
};

// ─── VERIFY OTP ────────────────────────────────────────────────────────────────
// Verifies OTP on Django.
export const verifyOtpApi = async (otp: string, username: string) => {
  // Retrieve the pending Django session cookie from login step 1
  const pendingSession = await AsyncStorage.getItem(KEYS.DJANGO_SESSION_PENDING);

  /*
  // ── Primary call: FastAPI
  const fastRes = await axios.post(`${FASTAPI_AUTH_URL}/verify-otp/`, { otp, username });
  */

  // ── Call: Django OTP verify (send pending session cookie back) ───
  const headers: Record<string, string> = {};
  if (pendingSession) {
    // Send the OTP-pending session so Django knows whose OTP this is
    headers['Cookie'] = `sessionid=${pendingSession}`;
  }
  
  const djangoRes = await axios.post(
    `${DJANGO_AUTH_URL}/verify-otp/`,
    { otp },
    { headers },
  );

  // Django flushes old session and creates a new full session on success
  const newSession = extractSessionId(djangoRes.headers);
  if (newSession) {
    await AsyncStorage.setItem(KEYS.DJANGO_SESSION, newSession);
  }
  
  // Clean up the pending session
  await AsyncStorage.removeItem(KEYS.DJANGO_SESSION_PENDING);

  return djangoRes.data;
};

// ─── LOGOUT ────────────────────────────────────────────────────────────────────
// Clears ALL stored credentials
export const logoutApi = async () => {
  await AsyncStorage.multiRemove([
    KEYS.JWT_TOKEN,
    KEYS.DJANGO_SESSION,
    KEYS.DJANGO_SESSION_PENDING,
  ]);
};