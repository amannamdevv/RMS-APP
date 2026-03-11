import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import OtpScreen from './src/screens/OtpScreen';
import HomeScreen from './src/screens/HomeScreen';
import SiteStatusScreen from './src/screens/SiteStatusScreen';
import SiteDetailsScreen from './src/screens/SiteDetailsScreen';
import NonCommSitesScreen from './src/screens/NonCommSitesScreen';
import SiteRunningStatusScreen from './src/screens/SiteRunningStatusScreen';
import SiteDistributionScreen from './src/screens/SiteDistributionScreen';
import SiteTypeDetailsScreen from './src/screens/SiteTypeDetailsScreen';
import DashboardScreen from './src/screens/Dashboard/DashboardScreen';
import SiteHealthScreen from './src/screens/Dashboard/SiteHealthScreen';

// Define routes and expected parameters
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Otp: { whatsappUrl: string, username: string };
  Home: { fullname: string };
  SiteStatus: undefined;
  SiteDetails: { imei: string, siteId: string };
  NonCommSites: undefined;
  SiteRunningStatus: undefined;
  SiteDistribution: undefined;
  SiteTypeDetails: { siteType: string, title: string, filters: any };
  Dashboard: { fullname: string };
  SiteHealth: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash" 
        screenOptions={{ headerShown: false }} // Hides the default header
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SiteStatus" component={SiteStatusScreen} />
        <Stack.Screen name="SiteDetails" component={SiteDetailsScreen} />
        <Stack.Screen name="NonCommSites" component={NonCommSitesScreen} />
        <Stack.Screen name="SiteRunningStatus" component={SiteRunningStatusScreen} />
        <Stack.Screen name="SiteDistribution" component={SiteDistributionScreen} />
        <Stack.Screen name="SiteTypeDetails" component={SiteTypeDetailsScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="SiteHealth" component={SiteHealthScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}