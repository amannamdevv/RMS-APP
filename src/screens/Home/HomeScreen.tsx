import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { logoutApi } from '../../api/auth';
import { api } from '../../api';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import Sidebar from '../../components/Sidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const renderMiniKPI = (label: string, value: any, color: string) => {
  const displayValue = typeof value === 'object' && value !== null && 'count' in value ? value.count : value;
  return (
    <View style={styles.miniKpi}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, { color }]}>{displayValue ?? 0}</Text>
    </View>
  );
};

export default function HomeScreen({ navigation, route }: any) {
  const [fullname, setFullname] = useState('Administrator');
  const [siteKpi, setSiteKpi] = useState<any>(null);
  const [runningKpi, setRunningKpi] = useState<any>(null);
  const [distKpi, setDistKpi] = useState<any>(null);
  const [offlineKpi, setOfflineKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    const manageFullname = async () => {
      const paramName = route?.params?.fullname;
      if (paramName && paramName !== 'User') {
        await AsyncStorage.setItem('user_fullname', paramName);
        setFullname(paramName);
      } else {
        const storedName = await AsyncStorage.getItem('user_fullname');
        if (storedName) setFullname(storedName);
      }
    };
    manageFullname();
  }, [route?.params?.fullname]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [siteRes, runningRes, distRes, offlineRes, dgRes, ebRes] = await Promise.all([
        api.getSiteHealthCounts({}),
        api.getSiteRunningStatus({}),
        api.getSiteDistributionCounts({}),
        api.getNonCommAging({}),
        api.getDgPresence({}),
        api.getEbPresence({})
      ]);

      // Normalize site status counts (handle direct response or success wrap)
      if (siteRes) {
        const raw = siteRes.status === 'success' ? (siteRes.data?.kpi || siteRes.kpi || siteRes.data || siteRes) : siteRes;
        setSiteKpi({
          total_sites: raw.total_sites ?? raw.total ?? raw.total_site ?? 0,
          active_sites: raw.up_sites ?? raw.active_sites ?? raw.up ?? raw.active ?? 0,
          non_active_sites: raw.down_sites ?? raw.non_active_sites ?? raw.down ?? raw.non_active ?? raw.offline ?? 0
        });
      }

      if (runningRes) {
        // Normalize running status counts (handle direct response or success wrap)
        const raw = runningRes.counts || (runningRes.status === 'success' ? (runningRes.data?.counts || runningRes.data) : runningRes);
        setRunningKpi({
          total_soeb: raw.total_soeb ?? raw.soeb ?? raw.eb ?? 0,
          total_sodg: raw.total_sodg ?? raw.sodg ?? raw.dg ?? 0,
          total_sobt: raw.total_sobt ?? raw.sobt ?? raw.bt ?? 0
        });
      }

      // Normalize Distribution counts (More robust parsing)
      let distRaw = distRes.counts || (distRes.status === 'success' ? (distRes.data?.counts || distRes.data) : (distRes.data || distRes));
      
      // Handle the specific nested structure from the Django API (indoor_outdoor, bsc_hub, tower_types)
      let mergedDist: any = {};
      if (distRaw && typeof distRaw === 'object' && !Array.isArray(distRaw)) {
        // Flatten nested objects like indoor_outdoor, bsc_hub, tower_types
        Object.values(distRaw).forEach(val => {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            mergedDist = { ...mergedDist, ...val };
          }
        });
        // Also merge top-level properties just in case
        mergedDist = { ...mergedDist, ...distRaw };
      }

      // If the backend returns an array like [{site_type: 'BSC', count: 10}, ...], convert it
      if (Array.isArray(distRaw)) {
        distRaw.forEach(item => {
          const key = (item.site_type || item.type || item.label || '').toLowerCase().replace(/[\s-]/g, '_');
          if (key) mergedDist[key] = item.count ?? item.value ?? 0;
        });
      }

      // Ensure explicit mapping for all UI keys
      mergedDist = {
        ...mergedDist,
        bsc: mergedDist.bsc ?? 0,
        hub: mergedDist.hub ?? 0,
        indoor: mergedDist.indoor ?? 0,
        outdoor: mergedDist.outdoor ?? 0,
        rtt: mergedDist.rtt ?? 0,
        rtp: mergedDist.rtp ?? 0,
        gbt: mergedDist.gbt ?? 0,
        small_cell: mergedDist.small_cell ?? mergedDist['small-cell'] ?? 0,
      };

      // Normalize DG Presence
      if (dgRes) {
        const dgRaw = dgRes.counts || (dgRes.status === 'success' ? (dgRes.data?.counts || dgRes.data) : (dgRes.data || dgRes));
        mergedDist.dg = dgRaw.dg_sites ?? dgRaw.dg ?? dgRaw.total_dg ?? dgRaw.dg_count ?? 0;
      }
      
      // Normalize EB Presence
      if (ebRes) {
        const ebRaw = ebRes.counts || (ebRes.status === 'success' ? (ebRes.data?.counts || ebRes.data) : (ebRes.data || ebRes));
        mergedDist.eb = ebRaw.eb_sites ?? ebRaw.eb ?? ebRaw.total_eb ?? ebRaw.eb_count ?? 0;
      }

      setDistKpi(mergedDist);

      if (offlineRes) {
        const offData = offlineRes.status === 'success' ? (offlineRes.data || offlineRes) : offlineRes;
        setOfflineKpi(offData);
      }
    } catch (error) {
      console.log('Dashboard Data Fetch Error', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user_fullname');
    await logoutApi();
    navigation.replace('Login');
  };

  const MetricCard = ({ label, value, icon, color, siteType, title }: any) => (
    <TouchableOpacity
      style={styles.smallCard}
      onPress={() => navigation.navigate('SiteTypeDetails', { siteType, title, filters: {} })}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardValue}>{value || 0}</Text>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      <Icon name="chevron-right" size={16} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3c72" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuIcon}>
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
        activeRoute="Home"
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Site Status Card */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('SiteStatus')}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeader}>Site Status</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </View>
          {loading ? <ActivityIndicator color="#1e3c72" /> : (
            <View style={styles.statsRow}>
              {renderMiniKPI('Total', siteKpi?.total_sites, '#1e3c72')}
              {renderMiniKPI('Active', siteKpi?.active_sites, '#10b981')}
              {renderMiniKPI('NON-ACTIVE', siteKpi?.non_active_sites, '#ef4444')}
            </View>
          )}
        </TouchableOpacity>

        {/* Running Status Card */}
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

        {/* Distribution Cards */}
        {loading ? <ActivityIndicator color="#1e3c72" style={{ marginVertical: 20 }} /> : distKpi && (
          <View style={{ marginBottom: 16 }}>
            {/* BSC & Hub */}
            <View style={styles.row}>
              <MetricCard label="BSC" value={distKpi.bsc} icon="layers" color="#0ea5e9" siteType="bsc" title="BSC Sites" />
              <MetricCard label="Hub" value={distKpi.hub} icon="server" color="#3b82f6" siteType="hub" title="Hub Sites" />
            </View>

            {/* Indoor & Outdoor */}
            <View style={styles.row}>
              <MetricCard label="Indoor" value={distKpi.indoor} icon="home" color="#8b5cf6" siteType="indoor" title="Indoor Sites" />
              <MetricCard label="Outdoor" value={distKpi.outdoor} icon="sun" color="#ec4899" siteType="outdoor" title="Outdoor Sites" />
            </View>

            {/* EB & DG */}
            <View style={styles.row}>
              <MetricCard label="EB" value={distKpi.eb} icon="zap" color="#10b981" siteType="eb" title="EB Sites" />
              <MetricCard label="DG" value={distKpi.dg} icon="cpu" color="#f59e0b" siteType="dg" title="DG Sites" />
            </View>

            <Text style={styles.sectionTitle}>Tower Type Distribution</Text>
            <View style={styles.grid}>
              {[
                { key: 'rtt', label: 'RTT', color: '#0ea5e9', icon: 'radio' },
                { key: 'rtp', label: 'RTP', color: '#3b82f6', icon: 'radio' },
                { key: 'gbt', label: 'GBT', color: '#6366f1', icon: 'radio' },
                { key: 'small-cell', label: 'Small Cell', color: '#8b5cf6', icon: 'radio' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.gridItem, { borderColor: item.color + '30' }]}
                  onPress={() => navigation.navigate('SiteTypeDetails', { siteType: item.key, title: item.label + ' Sites', filters: {} })}
                >
                  <View style={[styles.gridIcon, { backgroundColor: item.color + '10' }]}>
                    <Icon name={item.icon} size={16} color={item.color} />
                  </View>
                  <Text style={[styles.gridValue, { color: item.color }]}>{distKpi[item.key.replace('-', '_')] || distKpi[item.key] || 0}</Text>
                  <Text style={styles.gridLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Offline Sites Card */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('NonCommSites')}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="wifi-off" size={18} color="#dc2626" style={{ marginRight: 8 }} />
              <Text style={styles.cardHeader}>Offline Sites (Non-Comm)</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </View>
          {loading ? <ActivityIndicator color="#1e3c72" /> : (
            <>
              <View style={[styles.statsRow, { marginBottom: 15 }]}>
                {renderMiniKPI('Total', offlineKpi?.total_non_comm, '#dc2626')}
                {renderMiniKPI('0-7 Days', offlineKpi?.aging_buckets?.['0-7 days'], '#ca8a04')}
                {renderMiniKPI('8-30 Days', offlineKpi?.aging_buckets?.['8-30 days'], '#ea580c')}
              </View>
              <View style={styles.statsRow}>
                {renderMiniKPI('31-60 Days', offlineKpi?.aging_buckets?.['31-60 days'], '#dc2626')}
                {renderMiniKPI('61-90 Days', offlineKpi?.aging_buckets?.['61-90 days'], '#991b1b')}
                {renderMiniKPI('90+ Days', offlineKpi?.aging_buckets?.['90+ days'], '#7f1d1d')}
              </View>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c5d4eeff' },
  header: { backgroundColor: '#1e3c72', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuIcon: { paddingRight: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  mainCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 3 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8, marginBottom: 12 },
  cardHeader: { fontSize: 16, fontWeight: '700', color: '#1e3c72' },
  arrowIcon: { fontSize: 18, color: '#1e3c72', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  miniKpi: { alignItems: 'center', flex: 1 },
  miniLabel: { fontSize: 11, color: '#888', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  miniValue: { fontSize: 18, fontWeight: '800' },

  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  smallCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cardInfo: { flex: 1 },
  cardValue: { fontSize: 18, fontWeight: '800', color: '#1e3c72' },
  cardLabel: { fontSize: 11, color: '#666', fontWeight: '600', textTransform: 'uppercase' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e3c72', marginTop: 8, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 1
  },
  gridIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  gridValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  gridLabel: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase' }
});