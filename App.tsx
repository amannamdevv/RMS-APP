import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Auth screens — organized in their own folder
import SplashScreen from './src/screens/auth/SplashScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import OtpScreen from './src/screens/auth/OtpScreen';

// Main App screens
import HomeScreen from './src/screens/Home/HomeScreen';
import SiteStatusScreen from './src/screens/Home/SiteStatusScreen';
import SiteDetailsScreen from './src/screens/Home/SiteDetailsScreen';
import NonCommSitesScreen from './src/screens/Home/NonCommSitesScreen';
import SiteRunningStatusScreen from './src/screens/Home/SiteRunningStatusScreen';
import SiteDistributionScreen from './src/screens/Home/SiteDistributionScreen';
import SiteTypeDetailsScreen from './src/screens/Home/SiteTypeDetailsScreen';
import DashboardScreen from './src/screens/Dashboard/DashboardScreen';
import SiteHealthScreen from './src/screens/Dashboard/SiteHealthScreen';
import SiteVitalsScreen from './src/screens/Dashboard/SiteVitalsScreen';
import SiteAutomationScreen from './src/screens/Dashboard/SiteAutomationScreen';
import LiveAlarmsScreen from './src/screens/Dashboard/LiveAlarmsScreen';
import UptimeDetailsScreen from './src/screens/Dashboard/UptimeDetailsScreen';
import UptimeReportScreen from './src/screens/Dashboard/UptimeReportScreen';
import CommReportScreen from './src/screens/CommReportScreen';
import UptimeDashboardScreen from './src/screens/UptimeDashboard';
import UptimeSiteDetailsScreen from './src/screens/UptimeSiteDetails';
import DCEMAnalyticsScreen from './src/screens/DCEMAnalyticsScreen';
import DCEMMonthlyReportScreen from './src/screens/DCEMMonthlyReportScreen';
import NocAnalyticsScreen from './src/screens/NocAnalytics';
import Assethealthdashboard from './src/screens/Assethealthdashboard';
import MasterReportScreen from './src/screens/MasterReport';
import GridBillingScreen from './src/screens/GridBillingScreen';
import ResourceMappingScreen from './src/screens/ResourceMappingScreen';
import SiteVariationScreen from './src/screens/SiteVariationScreen';


import { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        {/* ── Auth ───────────────────────────────── */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />

        {/* ── Home ───────────────────────────────── */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SiteStatus" component={SiteStatusScreen} />
        <Stack.Screen name="SiteDetails" component={SiteDetailsScreen} />
        <Stack.Screen name="NonCommSites" component={NonCommSitesScreen} />
        <Stack.Screen name="SiteRunningStatus" component={SiteRunningStatusScreen} />
        <Stack.Screen name="SiteDistribution" component={SiteDistributionScreen} />
        <Stack.Screen name="SiteTypeDetails" component={SiteTypeDetailsScreen} />

        {/* ── Dashboard ──────────────────────────── */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="SiteHealth" component={SiteHealthScreen} />
        <Stack.Screen name="SiteVitals" component={SiteVitalsScreen} />
        <Stack.Screen name="SiteAutomation" component={SiteAutomationScreen} />
        <Stack.Screen name="LiveAlarms" component={LiveAlarmsScreen} />
        <Stack.Screen name="UptimeDetails" component={UptimeDetailsScreen} />
        <Stack.Screen name="UptimeReport" component={UptimeReportScreen} />

        {/* ── Reports & Analytics ────────────────── */}
        <Stack.Screen name="CommReport" component={CommReportScreen} />
        <Stack.Screen name="UptimeDashboard" component={UptimeDashboardScreen} />
        <Stack.Screen name="UptimeSiteDetails" component={UptimeSiteDetailsScreen} />
        <Stack.Screen name="DCEMAnalytics" component={DCEMAnalyticsScreen} />
        <Stack.Screen name="DCEMMonthlyReport" component={DCEMMonthlyReportScreen} />
        <Stack.Screen name="NocAnalytics" component={NocAnalyticsScreen} />
        <Stack.Screen name="AssetHealth" component={Assethealthdashboard} />
        <Stack.Screen name="MasterReport" component={MasterReportScreen} />
        <Stack.Screen name="GridBilling" component={GridBillingScreen} />
        <Stack.Screen name="ResourceMapping" component={ResourceMappingScreen} />
        <Stack.Screen name="SiteVariation" component={SiteVariationScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
