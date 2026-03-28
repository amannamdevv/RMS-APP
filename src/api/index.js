import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants & Configuration ──────────────────────────────────────────────────────────
const DJANGO_BASE_URL = 'http://rms.shrotitele.com';
const DJANGO_AUTH_URL = `${DJANGO_BASE_URL}/api/auth`;

const KEYS = {
  DJANGO_SESSION: 'djangoSession',
  DJANGO_SESSION_PENDING: 'djangoSessionPending',
};

// ─── Helper: extract sessionid from Set-Cookie response header ─────────────────
const extractSessionId = (headers) => {
  const raw = headers['set-cookie'] ?? headers['Set-Cookie'];
  if (!raw) return null;
  const cookies = Array.isArray(raw) ? raw : [raw];
  for (const cookie of cookies) {
    const match = cookie.match(/sessionid=([^;]+)/);
    if (match) return match[1];
  }
  return null;
};

// ─── Django Axios Instance ──────────────────────────────────────────────────────────
const attachDjangoAuth = async (config) => {
  const session = await AsyncStorage.getItem(KEYS.DJANGO_SESSION);
  if (session) {
    config.headers['Cookie'] = `sessionid=${session}`;
  }
  return config;
};

const djangoApi = axios.create({ baseURL: DJANGO_BASE_URL });
djangoApi.interceptors.request.use(attachDjangoAuth, (error) => Promise.reject(error));

// ──────────────────────────────────────────────────────────────────────────────
// ─── AUTHENTICATION (Login, OTP, Logout) ──────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────

export const loginApi = async (username, password) => {
  const djangoRes = await axios.post(`${DJANGO_AUTH_URL}/login/`, { username, password });
  const sessionId = extractSessionId(djangoRes.headers);
  if (sessionId) {
    await AsyncStorage.setItem(KEYS.DJANGO_SESSION_PENDING, sessionId);
  }
  if (djangoRes.data.status === 'success' && djangoRes.data.skip_otp) {
    if (sessionId) {
      await AsyncStorage.setItem(KEYS.DJANGO_SESSION, sessionId);
      await AsyncStorage.removeItem(KEYS.DJANGO_SESSION_PENDING);
    }
  }
  return djangoRes.data;
};

export const verifyOtpApi = async (otp, username) => {
  const pendingSession = await AsyncStorage.getItem(KEYS.DJANGO_SESSION_PENDING);
  const headers = {};
  if (pendingSession) {
    headers['Cookie'] = `sessionid=${pendingSession}`;
  }
  const djangoRes = await axios.post(`${DJANGO_AUTH_URL}/verify-otp/`, { otp }, { headers });
  const newSession = extractSessionId(djangoRes.headers);
  if (newSession) {
    await AsyncStorage.setItem(KEYS.DJANGO_SESSION, newSession);
  }
  await AsyncStorage.removeItem(KEYS.DJANGO_SESSION_PENDING);
  return djangoRes.data;
};

export const logoutApi = async () => {
  await AsyncStorage.multiRemove([KEYS.DJANGO_SESSION, KEYS.DJANGO_SESSION_PENDING]);
};


// ──────────────────────────────────────────────────────────────────────────────
// ─── MAIN API OBJECT (Grouped for Clarity) ────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────

export const api = {
  
  // ── HOME Related ──
  getSiteStatus: async (filters, page, pageSize) => {
    const response = await djangoApi.get('/api/status/', { params: { ...filters, page, page_size: pageSize } });
    return response.data;
  },
  getSiteRunningStatus: async (filters, page = 1, pageSize = 1000) => {
    const response = await djangoApi.get('/api/get-running-status-from-energy-logs/', { params: { ...filters, page, page_size: pageSize } });
    return response.data;
  },
  getDatewiseRunningDuration: async (imei, startDate, endDate) => {
    const response = await djangoApi.get('/api/get-datewise-running-duration/', { params: { imei, start_date: startDate, end_date: endDate } });
    return response.data;
  },
  getSitesWentOnBackupCount: async (date) => {
    const response = await djangoApi.get('/api/sites-went-on-backup-count/', { params: { date } });
    return response.data;
  },
  getSiteDistributionCounts: async (filters) => {
    const response = await djangoApi.get('/api/site-type-distribution/', { params: filters });
    return response.data;
  },
  getDgPresence: async (filters) => {
    const response = await djangoApi.get('/api/dg-presence/', { params: filters });
    return response.data;
  },
  getEbPresence: async (filters) => {
    const response = await djangoApi.get('/api/eb-presence/', { params: filters });
    return response.data;
  },
  getNonCommAging: async (filters) => {
    const response = await djangoApi.get('/api/non-comm-aging/', { params: filters });
    return response.data;
  },
  getNonCommSitesList: async (filters, page = 1, pageSize = 10) => {
    const response = await djangoApi.get('/api/non-communicating-sites/', { params: { ...filters, page, page_size: pageSize } });
    return response.data;
  },
  getSiteDetails: async (id) => {
    const response = await djangoApi.get('/api/merge-site-details/', { params: { imei: id } });
    return response.data;
  },
  getSitesByType: async (siteType, filters, page = 1, pageSize = 1000) => {
    const response = await djangoApi.get(`/api/sites-by-type/${siteType}/`, { params: { ...filters, page, page_size: pageSize } });
    return response.data;
  },

  // ── DASHBOARD Related ──
  getSiteHealthCounts: async (filters) => {
    const response = await djangoApi.get('/api/site-health-status/', { params: filters });
    return response.data;
  },
  getSiteHealth: async (filters, page = 1, pageSize = 20) => {
    const response = await djangoApi.get('/api/site-health-details/', { params: { ...filters, page, page_size: pageSize } });
    return response.data;
  },
  getBatteryVitalsCounts: async (filters) => {
    try {
      const response = await djangoApi.get('/api/site-status/', { params: { ...filters, page: 1, page_size: 1 } });
      return response.data.battery_analytics;
    } catch (error) { return null; }
  },
  getSiteVitals: async (filters, page = 1, pageSize) => {
    const response = await djangoApi.get('/api/site-vitals-details/', { params: { ...filters, page, page_size: pageSize } });
    return response.data;
  },
  getAutomationStatus: async (filters) => {
    const response = await djangoApi.get('/api/automation-status/', { params: filters });
    return response.data;
  },
  getAutomationDetails: async (filters, page = 1, pageSize = 1000) => {
    const response = await djangoApi.get('/api/automation-details/', { params: { ...filters, page, page_size: pageSize } });
    return response.data;
  },
  getAlarms: async (filters, pageSize = 100) => {
    const response = await djangoApi.get('/api/alarms/', { params: { ...filters, page_size: pageSize } });
    return response.data;
  },
  getSmpsAlarms: async (filters, pageSize = 100) => {
    const response = await djangoApi.get('/api/alarms/', { params: { ...filters, page_size: pageSize } });
    return response.data;
  },
  getLiveFastAlarms: async (filters, pageSize = 100) => {
    const response = await djangoApi.get('/api/live-fast-alarms/', { params: { ...filters, page_size: pageSize } });
    return response.data;
  },
  getRmsAlarms: async (filters, pageSize = 100) => {
    const response = await djangoApi.get('/api/live-fast-alarms/', { params: { ...filters, page_size: pageSize } });
    return response.data;
  },

  // ── UPTIME & SLA ──
  getUptimeSummary: async (filters) => {
    const res = await djangoApi.get('/daily-uptime-report/', { params: filters });
    return res.data;
  },
  getUptimeDetails: async (filters) => {
    const ctmid = await AsyncStorage.getItem('user_ctmid');
    const aid = await AsyncStorage.getItem('user_id');
    const response = await djangoApi.get('/api/home-uptime-detail/', { params: { ...filters, ctmid, user_id: aid } });
    return response.data;
  },
  getSlaCompliance: async (filters) => {
    const response = await djangoApi.get('/api/uptime-sla/sla-compliance/', { params: filters });
    return response.data;
  },
  getUptimeComparison: async (filters) => {
    const response = await djangoApi.get('/api/uptime-sla/comparison/', { params: filters });
    return response.data;
  },
  getCircleUptime: async (filters) => {
    const response = await djangoApi.get('/api/uptime-sla/circle-wise/', { params: filters });
    return response.data;
  },
  getOpcoUptime: async (filters) => {
    const response = await djangoApi.get('/api/uptime-sla/opco-wise/', { params: filters });
    return response.data;
  },
  getAttributeAnalysis: async (filters) => {
    const response = await djangoApi.get('/api/uptime-sla/attribute-wise/', { params: filters });
    return response.data;
  },
  getRepeatOutages: async (filters, threshold = 2) => {
    const response = await djangoApi.get('/api/uptime-sla/repeat-outages/', { params: { ...filters, threshold } });
    return response.data;
  },
  getSeasonalPreparedness: async (filters, season = 'Summer') => {
    const response = await djangoApi.get('/api/uptime-sla/seasonal-preparedness/', { params: { ...filters, season } });
    return response.data;
  },
  getSiteWiseUptime: async (filters) => {
    const response = await djangoApi.get('/api/uptime-sla/site-wise/', { params: filters });
    return response.data;
  },
  getMonthlyUptimeHistory: async (filters, groupby = 'site') => {
    const response = await djangoApi.get('/api/uptime-sla/monthly-history/', { params: { ...filters, groupby } });
    return response.data;
  },
  getQuarterlyUptimeHistory: async (filters, groupby = 'site') => {
    const response = await djangoApi.get('/api/uptime-sla/quarterly-history/', { params: { ...filters, groupby } });
    return response.data;
  },

  // ── DCEM & ENERGY ──
  getDCEMAnalytics: async (params = {}) => {
    const response = await djangoApi.get('/api/dcem/analytics/', { params });
    return response.data;
  },
  getDCEMMonthlyReport: async (params = {}) => {
    const response = await djangoApi.get('/api/dcem/monthly-report/', { params });
    return response.data;
  },
  getEnergyRunHours: async (params = {}) => {
    const response = await djangoApi.get('/api/energy/run-hours/', { params });
    return response.data;
  },
  getEnergyRunHoursDetails: async (params = {}) => {
    const response = await djangoApi.get('/api/energy/run-hours-details/', { params });
    return response.data;
  },

  // ── MAINTENANCE & TOOLS ──
  getTTTools: async () => {
    const response = await djangoApi.get('/api/tt_tools/');
    return response.data;
  },
  submitTTTool: async (formData) => {
    const response = await djangoApi.post('/api/tt_tools/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },
  getToolData: async (params = {}) => {
    const response = await djangoApi.get('/api/tool/', { params });
    return response.data;
  },

  // ── REPORTS & HISTORY ──
  getMasterReport: async (filters, page = 1, pageSize = 25) => {
    const response = await djangoApi.get('/api/rms/master-report/', { params: { ...filters, page, page_size: pageSize } });
    return response.data;
  },
  getRevenueData: async (params = {}) => {
    const response = await djangoApi.get('/api/revenue-data/', { params });
    return response.data;
  },
  getSiteLogs: async (params = {}) => {
    const response = await djangoApi.get('/api/site-logs/', { params });
    return response.data;
  },
  getHistoricalAlarms: async (params = {}) => {
    const response = await djangoApi.get('/api/historical-alarms/', { params });
    return response.data;
  },
  exportFilteredData: async (filters) => {
    const response = await djangoApi.get('/api/site-status/', { params: { ...filters, page: 1, page_size: 10000 } });
    return response.data;
  },
  exportNonCommSites: async (filters) => {
    return await djangoApi.get('/non-communicating-sites/export/', { params: filters, responseType: 'blob' });
  },
  getCommunicationData: async (imei) => {
    const response = await djangoApi.get(`/api/communication/${imei}/`);
    return response.data;
  },

  // ── ANALYTICS ──
  getNocAnalytics: async (period = 'today', filter = 'all') => {
    const response = await djangoApi.get('/api/noc-analytics/', { params: { period, filter } });
    return response.data;
  },
  getSiteSummary: async (filters = {}) => {
    const response = await djangoApi.get('/api/site-summary/', { params: filters });
    return response.data;
  },
  getSiteVariationData: async (filters = {}, page = 1, pageSize = 100) => {
    const response = await djangoApi.get('/api/site-variation-data/', { params: { ...filters, page, page_size: pageSize } });
    return response.data;
  },
  getGridAnalytics: async (params = {}) => {
    const response = await djangoApi.get('/api/grid-analytics/', { params });
    return response.data;
  },

  // ── METADATA & DROPDOWNS ──
  getStates: async () => {
    const response = await djangoApi.get('/api/location-dropdowns/', { params: { type: 'state' } });
    return response.data;
  },
  getDistricts: async (state_id) => {
    const response = await djangoApi.get('/api/location-dropdowns/', { params: { type: 'district', state_id } });
    return response.data;
  },
  getClusters: async (district_id) => {
    const response = await djangoApi.get('/api/location-dropdowns/', { params: { type: 'cluster', district_id } });
    return response.data;
  },
  getMetadata: async (type) => {
    const response = await djangoApi.get('/api/location-dropdowns/', { params: { type } });
    return response.data;
  },

  // ── ASSET HEALTH ──
  getAssetHealthBattery: async (params = {}) => {
    const response = await djangoApi.get('/api/asset-health/battery/', { params });
    return response.data;
  },
  getAssetHealthDG: async (params = {}) => {
    const response = await djangoApi.get('/api/asset-health/dg/', { params });
    return response.data;
  },
  getAssetHealthRectifier: async (params = {}) => {
    const response = await djangoApi.get('/api/asset-health/rectifier/', { params });
    return response.data;
  },
  getAssetHealthSolar: async (params = {}) => {
    const response = await djangoApi.get('/api/asset-health/solar/', { params });
    return response.data;
  },
  getAssetHealthDGBattery: async (params = {}) => {
    const response = await djangoApi.get('/api/asset-health/dg-battery/', { params });
    return response.data;
  },
  getAssetHealthLightning: async (params = {}) => {
    const response = await djangoApi.get('/api/asset-health/lightning-arrester/', { params });
    return response.data;
  },

  // ── SUPPORT ──
  submitSupportTicket: async (formData) => {
    const response = await djangoApi.post('/api/support/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // ── ROBOTIC CALLS ──
  getRoboticCalls: async (params = {}) => {
    const response = await djangoApi.get('/api/robotic-calls/', { params });
    return response.data;
  },
  exportRoboticCalls: async (params = {}) => {
    return await djangoApi.get('/api/robotic-calls/export/', { params, responseType: 'blob' });
  },
};
