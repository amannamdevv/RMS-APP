import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { logoutApi } from '../api/auth';
import { api } from '../api'; 
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native'; 
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation, route }: Props) {
  const { fullname } = route.params;

  // State to hold the KPIs
  const [kpi, setKpi] = useState({ total_sites: 0, active_sites: 0, non_active_sites: 0 });
  const [loadingKpi, setLoadingKpi] = useState(true);

  // Fetch KPIs whenever this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchDashboardData = async () => {
        setLoadingKpi(true);
        try {
          const res = await api.getSiteStatus({}, 1, 1);
          if (res.status === 'success' && isActive) {
            setKpi(res.data.kpi);
          }
        } catch (error) {
          console.log('Failed to fetch home KPIs', error);
        } finally {
          if (isActive) setLoadingKpi(false);
        }
      };

      fetchDashboardData();

      return () => {
        isActive = false; 
      };
    }, [])
  );

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (e) {
      console.log('Logout API failed, forcing logout anyway');
    }
    navigation.replace('Login');
  };

  // 1. ADDED NON-COMM SITES TO MENU & ATTACHED KPI COUNT
  const menuItems = [
    {
      id: 'NonComm',
      title: 'Offline Sites',
      subtitle: 'Non-Communicating',
      icon: '📡',
      color: '#dc2626', // Red color to draw attention
      route: 'NonCommSites' as const,
      count: kpi.non_active_sites, // <-- Injecting live count here!
    },
    {
      id: 'Alarms',
      title: 'Active Alarms',
      subtitle: 'Critical Alerts',
      icon: '🚨',
      color: '#ef4444',
      route: 'Alarms' as const,
    },
    {
      id: 'Reports',
      title: 'Energy Reports',
      subtitle: 'Mains & DG Logs',
      icon: '⚡',
      color: '#10b981',
      route: 'Reports' as const,
    },
    {
      id: 'Settings',
      title: 'Settings',
      subtitle: 'App Preferences',
      icon: '⚙️',
      color: '#6366f1',
      route: 'Settings' as const,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3c72" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {fullname}</Text>
          <Text style={styles.subtitle}>RMS Dashboard Overview</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>System is Online</Text>
          <Text style={styles.welcomeText}>
            All monitoring services are running smoothly. Select a module below to view details.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Modules</Text>
        
        {/* BIG SITE STATUS CARD */}
        <TouchableOpacity
          style={styles.fullWidthCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SiteStatus')}
        >
          <View style={styles.fullWidthCardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#1e3c7215', marginBottom: 0 }]}>
              <Text style={styles.icon}>📊</Text>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.cardTitle}>Site Status</Text>
              <Text style={styles.cardSubtitle}>Live KPIs & Health</Text>
            </View>
            <Text style={{ color: '#1e3c72', fontSize: 18 }}>→</Text>
          </View>

          <View style={styles.kpiDivider} />

          {loadingKpi ? (
            <ActivityIndicator size="small" color="#1e3c72" style={{ marginVertical: 10 }} />
          ) : (
            <View style={styles.kpiRow}>
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiNumber, { color: '#1e3c72' }]}>{kpi.total_sites}</Text>
                <Text style={styles.kpiLabel}>Total</Text>
              </View>
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiNumber, { color: '#10b981' }]}>{kpi.active_sites}</Text>
                <Text style={styles.kpiLabel}>Active</Text>
              </View>
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiNumber, { color: '#ef4444' }]}>{kpi.non_active_sites}</Text>
                <Text style={styles.kpiLabel}>Down</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* 2. UPDATED GRID TO SUPPORT LIVE COUNTS & NAVIGATION */}
        <View style={styles.grid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => {
                // Navigate if the route matches our new screen
                if (item.route === 'NonCommSites') {
                  navigation.navigate('NonCommSites');
                } else {
                  console.log(`Navigation to ${item.route} not yet built`);
                }
              }}
            >
              <View style={styles.cardIconRow}>
                <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                  <Text style={styles.icon}>{item.icon}</Text>
                </View>
                
                {/* 3. SHOW BADGE IF COUNT EXISTS */}
                {item.count !== undefined && !loadingKpi && (
                  <View style={[styles.badge, { backgroundColor: item.color }]}>
                    <Text style={styles.badgeText}>{item.count}</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: '#1e3c72', padding: 20, paddingTop: 30, paddingBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  greeting: { color: '#fff', fontSize: 24, fontWeight: 'bold' }, subtitle: { color: '#c0c6e8', fontSize: 14, marginTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 13 }, scrollContent: { padding: 20 },
  welcomeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, marginTop: -10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  welcomeTitle: { fontSize: 18, fontWeight: '700', color: '#1e3c72', marginBottom: 8 }, welcomeText: { fontSize: 14, color: '#666', lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16 }, 
  
  fullWidthCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  fullWidthCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kpiDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  kpiCol: { alignItems: 'center' },
  kpiNumber: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  kpiLabel: { fontSize: 12, color: '#888', fontWeight: '600', textTransform: 'uppercase' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { backgroundColor: '#fff', width: '48%', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  
  // New Styles for the Card layout to support Badges
  cardIconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, minWidth: 24, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  
  iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 24 }, 
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e3c72', marginBottom: 4 }, 
  cardSubtitle: { fontSize: 12, color: '#8a8fa8' },
});