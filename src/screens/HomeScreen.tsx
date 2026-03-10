import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { logoutApi } from '../api/auth';
import { api } from '../api';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import Sidebar from '../components/Sidebar';

export default function HomeScreen({ navigation, route }: any) {
  const { fullname } = route.params;
  
  // State to hold data for the 3 separate cards
  const [siteKpi, setSiteKpi] = useState<any>(null);
  const [runningKpi, setRunningKpi] = useState<any>(null);
  const [distKpi, setDistKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isSidebarVisible, setSidebarVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Run all 3 API calls concurrently for speed
      const [siteRes, runningRes, distRes] = await Promise.all([
        api.getSiteStatus({}, 1, 1),
        api.getSiteRunningStatus({}),
        api.getSiteDistributionCounts({})
      ]);

      if (siteRes.status === 'success') setSiteKpi(siteRes.data.kpi);
      if (runningRes.status === 'success') setRunningKpi(runningRes.counts);
      if (distRes.status === 'success') setDistKpi(distRes.data);

    } catch (error) {
      console.log('Dashboard Data Fetch Error', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutApi();
    navigation.replace('Login');
  };

  // Helper to render mini-KPI columns inside cards
  const renderMiniKPI = (label: string, value: any, color: string) => (
    <View style={styles.miniKpi}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, { color }]}>{value || 0}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3c72" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)}>
          <Icon name="menu" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home</Text>
        <View style={{ width: 26 }} /> 
      </View>

      <Sidebar 
        isVisible={isSidebarVisible} 
        onClose={() => setSidebarVisible(false)} 
        navigation={navigation} 
        fullname={fullname}
        handleLogout={handleLogout}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        
        {/* SITE STATUS CARD - Fixed Navigation */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('SiteStatus')}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeader}>Site Status</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </View>
          
          {loading ? <ActivityIndicator color="#1e3c72" /> : (
            <View style={styles.statsRow}>
              {renderMiniKPI('Total', siteKpi?.total_sites, '#1e3c72')}
              {renderMiniKPI('Active', siteKpi?.active_sites, '#10b981')}
              {renderMiniKPI('Down', siteKpi?.non_active_sites, '#ef4444')}
            </View>
          )}
        </TouchableOpacity>

        {/* RUNNING STATUS CARD */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('SiteRunningStatus')}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeader}>Running Status</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </View>

          {loading ? <ActivityIndicator color="#1e3c72" /> : (
            <View style={styles.statsRow}>
              {renderMiniKPI('SOEB', runningKpi?.total_soeb, '#10b981')}
              {renderMiniKPI('SODG', runningKpi?.total_sodg, '#f59e0b')}
              {renderMiniKPI('SOBT', runningKpi?.total_sobt, '#3b82f6')}
            </View>
          )}
        </TouchableOpacity>

        {/* DISTRIBUTION CARD - Expanded to show all types */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('SiteDistribution')}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeader}>Site Distribution</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </View>

          {loading ? <ActivityIndicator color="#1e3c72" /> : (
            <>
              {/* Row 1: BSC, Hub, Indoor, Outdoor */}
              <View style={[styles.statsRow, { marginBottom: 15 }]}>
                {renderMiniKPI('BSC', distKpi?.bsc, '#0ea5e9')}
                {renderMiniKPI('Hub', distKpi?.hub, '#3b82f6')}
                {renderMiniKPI('Indoor', distKpi?.indoor, '#8b5cf6')}
                {renderMiniKPI('Outdoor', distKpi?.outdoor, '#ec4899')}
              </View>

              {/* Row 2: EB, Non-EB, DG, Non-DG */}
              <View style={styles.statsRow}>
                {renderMiniKPI('EB', distKpi?.eb, '#10b981')}
                {renderMiniKPI('No EB', distKpi?.non_eb, '#64748b')}
                {renderMiniKPI('DG', distKpi?.dg, '#f59e0b')}
                {renderMiniKPI('No DG', distKpi?.non_dg, '#ef4444')}
              </View>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: '#1e3c72', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  mainCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 3 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8, marginBottom: 12 },
  cardHeader: { fontSize: 16, fontWeight: '700', color: '#1e3c72' },
  arrowIcon: { fontSize: 18, color: '#1e3c72', fontWeight: 'bold' },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  miniKpi: { alignItems: 'center', flex: 1 },
  miniLabel: { fontSize: 11, color: '#888', fontWeight: 'bold', marginBottom: 4 },
  miniValue: { fontSize: 18, fontWeight: '800' }
});