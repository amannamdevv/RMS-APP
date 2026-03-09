import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.1.40:8109/api/auth';

export const loginApi = async (username: string, password: string) => {
  const res = await axios.post(`${BASE_URL}/login/`, { username, password });
  if (res.data.token) {
    await AsyncStorage.setItem('userToken', res.data.token);
  }
  return res.data;
};

export const verifyOtpApi = async (otp: string, username: string) => {
  // Notice we must pass username now!
  const res = await axios.post(`${BASE_URL}/verify-otp/`, { otp, username });
  if (res.data.token) {
    await AsyncStorage.setItem('userToken', res.data.token);
  }
  return res.data;
};

export const logoutApi = async () => {
  await AsyncStorage.removeItem('userToken');
};