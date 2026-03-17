import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Base URLs ────────────────────────────────────────────────────────────────
// const FASTAPI_BASE_URL = 'http://192.168.1.40:8109/api';
const DJANGO_BASE_URL = 'http://rms.shrotitele.com';

// ─── FastAPI interceptor: Bearer JWT token ─────────────────────────────────────
/*
const attachJwt = async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};
*/

// ─── Django interceptor: session cookie + JWT fallback ────────────────────────
// Sends Django session cookie as Cookie header (primary).
// Also attaches JWT Bearer as fallback once @jwt_or_session_required is on server.
const attachDjangoAuth = async (config) => {
  const [session, token] = await AsyncStorage.multiGet([
    'djangoSession',
    'userToken',
  ]);

  const sessionId = session[1]; // ['djangoSession', value]
  const jwt = token[1];   // ['userToken', value]

  if (sessionId) {
    config.headers['Cookie'] = `sessionid=${sessionId}`;
  }
  if (jwt) {
    // Fallback — accepted once @jwt_or_session_required is applied on Django
    config.headers['Authorization'] = `Bearer ${jwt}`;
  }
  return config;
};

// ─── Axios instances ──────────────────────────────────────────────────────────
// const fastApi = axios.create({ baseURL: FASTAPI_BASE_URL });
// fastApi.interceptors.request.use(attachJwt, (error) => Promise.reject(error));

const djangoApi = axios.create({ baseURL: DJANGO_BASE_URL });
djangoApi.interceptors.request.use(attachDjangoAuth, (error) => Promise.reject(error));

// ─── Unified API surface ──────────────────────────────────────────────────────
export const api = {

  // ── Django endpoints (Formerly FastAPI) ──────────────────────────────────────

  getSiteStatus: async (filters, page, pageSize) => {
    const response = await djangoApi.get('/api/status/', {
      params: { ...filters, page, page_size: pageSize },
    });
    return response.data;
  },

  getSiteHealthCounts: async (filters) => {
    const response = await djangoApi.get('/api/site-health/', { params: filters });
    return response.data;
  },

  getCommunicationData: async (imei) => {
    const response = await djangoApi.get(`/api/communication/${imei}/`);
    return response.data;
  },

  exportFilteredData: async (filters) => {
    const response = await djangoApi.get('/api/site-status/', {
      params: { ...filters, page: 1, page_size: 10000 },
    });
    return response.data;
  },

  getStates: async () => {
    const response = await djangoApi.get('/api/location-dropdowns/', {
      params: { type: 'state' },
    });
    return response.data;
  },

  getDistricts: async (state_id) => {
    const response = await djangoApi.get('/api/location-dropdowns/', {
      params: { type: 'district', state_id },
    });
    return response.data;
  },

  getClusters: async (district_id) => {
    const response = await djangoApi.get('/api/location-dropdowns/', {
      params: { type: 'cluster', district_id },
    });
    return response.data;
  },

  // Generic metadata for other dropdowns
  getMetadata: async (type) => {
    const response = await djangoApi.get('/api/location-dropdowns/', {
      params: { type },
    });
    return response.data;
  },

  getSiteDetails: async (id) => {
    const response = await djangoApi.get('/api/merge-site-details/', {
      params: { imei: id }
    });
    return response.data;
  },

  getNonCommAging: async (filters) => {
    const response = await djangoApi.get('/api/non-comm-aging/', { params: filters });
    return response.data;
  },

  getNonCommSitesList: async (filters, page, pageSize) => {
    const response = await djangoApi.get('/api/non-communicating-sites/', {
      params: { ...filters, page, page_size: pageSize },
    });
    // Django returns { sites: [...] } directly
    return response.data;
  },

  exportNonCommSites: async (filters) => {
    return await djangoApi.get('/non-communicating-sites/export/', {
      params: filters,
      responseType: 'blob'
    });
  },

  // 1. For BSC, Hub, Indoor, Outdoor, Tower Type Distribution 
  getSiteDistributionCounts: async (filters) => {
    // Ye 'site_type_distribution_api' ko hit karega
    const response = await djangoApi.get('/api/site-type-distribution/', { params: filters });
    return response.data;
  },

  getSitesByType: async (siteType, filters, page = 1, pageSize = 1000) => {
    const response = await djangoApi.get(`/api/sites-by-type/${siteType}/`, {
      params: { ...filters, page, page_size: pageSize }
    });
    return response.data;
  },


  // Site Health Status
  getSiteHealthCounts: async (filters) => {
    const response = await djangoApi.get('/api/site-health-status/', { params: filters });
    return response.data;
  },

  getSiteHealth: async (filters, page = 1, pageSize = 20) => {
    const response = await djangoApi.get('/api/site-health-details/', {
      params: { ...filters, page, page_size: pageSize },
    });
    return response.data;
  },

  getSiteRunningStatus: async (filters, page = 1, pageSize = 1000) => {
    // Ye endpoint aapke 'app2_views.get_running_status_from_energy_logs' ko hit karega
    const response = await djangoApi.get('/api/get-running-status-from-energy-logs/', {
      params: { ...filters, page, page_size: pageSize },
    });
    return response.data;
  },

  // 2. DG Presence (DG vs Non-DG Count)
  getDgPresence: async (filters) => {
    // Ye 'dg_presence_api' ko hit karega
    const response = await djangoApi.get('/api/dg-presence/', { params: filters });
    return response.data;
  },

  // 3. EB Presence (EB vs Non-EB Count)
  getEbPresence: async (filters) => {
    // Ye 'eb_presence_api' ko hit karega
    const response = await djangoApi.get('/api/eb-presence/', { params: filters });
    return response.data;
  },

  // site Battery Vitals
  getBatteryVitalsCounts: async (filters) => {
    try {
      const response = await djangoApi.get('/api/site-status/', {
        params: { ...filters, page: 1, page_size: 1 },
      });
      return response.data.battery_analytics;
    } catch (error) {
      console.error("API Error in getBatteryVitalsCounts:", error);
      return null;
    }
  },

  getSiteVitals: async (filters, page = 1, pageSize) => {
    const response = await djangoApi.get('/api/site-vitals-details/', {
      params: { ...filters, page, page_size: pageSize },
    });
    return response.data;
  },

  // Site Automation
  getAutomationStatus: async (filters) => {
    const response = await djangoApi.get('/api/automation-status/', {
      params: filters,
    });
    return response.data;
  },

  getAutomationDetails: async (filters, page = 1, pageSize = 1000) => {
    const response = await djangoApi.get('/api/automation-details/', {
      params: { ...filters, page, page_size: pageSize },
    });
    return response.data;
  },

  // Live Alarms
  getSmpsAlarms: async (filters, pageSize = 100) => {
    const response = await djangoApi.get('/api/alarms/', { params: { ...filters, page_size: pageSize } });
    return response.data;
  },

  getRmsAlarms: async (filters, pageSize = 100) => {
    const response = await djangoApi.get('/api/live-fast-alarms/', { params: { ...filters, page_size: pageSize } });
    return response.data;
  },


  // Uptime Summary
  getUptimeSummary: async (filters) => {
    const res = await djangoApi.get('/daily-uptime-report/', { params: filters });
    return res.data;
  },

  getUptimeDetails: async (filters) => {
    const ctmid = await AsyncStorage.getItem('user_ctmid');
    const aid = await AsyncStorage.getItem('user_id');

    const response = await djangoApi.get('/api/home-uptime-detail/', {
      params: {
        ...filters,
        ctmid: ctmid,
        user_id: aid
      }
    });
    return response.data;
  },


};