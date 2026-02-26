/**
 * RMS Mobile App – Root Component
 *
 * Auth flow:
 *  1. LoginScreen   → credentials validated → skip_otp? → HomeScreen
 *  2.                                        → OTP needed → OtpScreen → HomeScreen
 */

import React, {useState} from 'react';
import LoginScreen from './src/screens/LoginScreen';
import OtpScreen from './src/screens/OtpScreen';
import HomeScreen from './src/screens/HomeScreen';

type Screen = 'login' | 'otp' | 'home';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [fullname, setFullname] = useState('');

  // Login step 1: credentials OK, OTP required
  const handleOtpRequired = (url: string) => {
    setWhatsappUrl(url);
    setScreen('otp');
  };

  // Login step 1 (whitelist): skip OTP, go to home
  const handleLoginSuccess = (info: {fullname: string}) => {
    setFullname(info.fullname);
    setScreen('home');
  };

  // OTP verified → home
  const handleOtpVerified = (name: string) => {
    setFullname(name);
    setScreen('home');
  };

  // Logout → back to login
  const handleLogout = () => {
    setFullname('');
    setWhatsappUrl('');
    setScreen('login');
  };

  if (screen === 'otp') {
    return (
      <OtpScreen
        whatsappUrl={whatsappUrl}
        onVerified={handleOtpVerified}
        onBack={() => setScreen('login')}
      />
    );
  }

  if (screen === 'home') {
    return <HomeScreen fullname={fullname} onLogout={handleLogout} />;
  }

  return (
    <LoginScreen
      onOtpRequired={handleOtpRequired}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
