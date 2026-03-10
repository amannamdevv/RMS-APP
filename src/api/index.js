import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = "http://192.168.1.40:8109/api";

const instance = axios.create({
  baseURL: BASE_URL,
});

instance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const api = {
  getSiteStatus: async (filters, page, pageSize) => {
    const response = await instance.get("/site-status/", { params: { ...filters, page, page_size: pageSize } });
    return response.data;
  },
  getCommunicationData: async (imei) => {
    const response = await instance.get(`/communication/${imei}/`);
    return response.data;
  },
  exportFilteredData: async (filters) => {
    const response = await instance.get("/site-status/", { params: { ...filters, page: 1, page_size: 10000 } });
    return response.data; 
  },
  getStates: async () => {
    const response = await instance.get("/location-dropdowns/", { params: { type: 'state' } });
    return response.data;
  },
  getDistricts: async (state_id) => {
    const response = await instance.get("/location-dropdowns/", { params: { type: 'district', state_id } });
    return response.data;
  },
  getClusters: async (district_id) => {
    const response = await instance.get("/location-dropdowns/", { params: { type: 'cluster', district_id } });
    return response.data;
  },
  getSiteDetails: async (imei) => {
    const response = await instance.get(`/site-details/${imei}/`);
    return response.data;
  },
  getNonCommAging: async (filters) => {
    const response = await instance.get("/non-comm-aging/", { params: filters });
    return response.data;
  },
  getNonCommSitesList: async (filters, page, pageSize) => {
    const response = await instance.get("/non-communicating-sites/", { 
      params: { ...filters, page, page_size: pageSize } 
    });
    return response.data;
  },
  getSiteRunningStatus: async (filters) => {
    const response = await instance.get("/site-running-status/", { params: filters });
    return response.data;
  },
  getSiteDistributionCounts: async (filters) => {
    const response = await instance.get("/site-distribution-counts/", { params: filters });
    return response.data;
  },
  getSitesByType: async (siteType, filters) => {
    const response = await instance.get(`/sites-by-type/${siteType}/`, { params: filters });
    return response.data;
  },
  getSiteHealth: async (filters, page = 1, pageSize = 20) => {
    const response = await instance.get("/site-health/", { 
      params: { ...filters, page, page_size: pageSize } 
    });
    return response.data;
  },
};