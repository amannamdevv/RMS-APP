import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { api } from '../../api';
import { logoutApi } from '../../api/auth';
import Icon from 'react-native-vector-icons/Feather';
import Sidebar from '../../components/Sidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [fullname, setFullname] = useState('Administrator');

  // KPI States
  const [healthKpi, setHealthKpi] = useState<any>(null);
  const [vitalsCounts, setVitalsCounts] = useState<any>(null);
  const [autoKpi, setAutoKpi] = useState<any>(null);
  const [uptimeKpi, setUptimeKpi] = useState<any>(null);
  const [alarmKpi, setAlarmKpi] = useState({ major: 0, minor: 0, fire: 0, nightDoor: 0, active: 0 });

  useEffect(() => {
    const loadName = async () => {
      const storedName = await AsyncStorage.getItem('user_fullname');
      if (storedName) setFullname(storedName);
    };
    loadName();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // All APIs Parallel Call for Speed
      const [healthRes, vitalsRes, autoRes, uptimeRes, smpsAlarms, rmsAlarms] = await Promise.all([
        api.getSiteHealthCounts({}),
        api.getBatteryVitalsCounts({}),
        api.getAutomationStatus({}),
        api.getUptimeSummary({}),
        api.getSmpsAlarms({}),
        api.getRmsAlarms({})
      ]);

      // 1. Site Health
      if (healthRes) setHealthKpi(healthRes);

      // 2. Battery Vitals (6-count logic)
      if (vitalsRes) setVitalsCounts(vitalsRes);

      // 3. Automation Status
      if (autoRes && autoRes.status === 'success') setAutoKpi(autoRes.data);

      // 4. Uptime Summary (MTD)
      if (uptimeRes && uptimeRes.status === 'success') {
        const report = uptimeRes.state_report || [];
        const totalMet = report.reduce((sum: number, s: any) => sum + (s.sites_met_sla || 0), 0);
        const totalNotMet = report.reduce((sum: number, s: any) => sum + (s.sites_not_met_sla || 0), 0);

        setUptimeKpi({
          ...uptimeRes.summary,
          total_met: totalMet,
          total_not_met: totalNotMet
        });
      }

      // 5. Alarms Severity Logic (Matches Portal)
      const allAlarms = [
        ...(Array.isArray(smpsAlarms) ? smpsAlarms : (smpsAlarms.data || [])),
        ...(rmsAlarms.data || [])
      ];

      let aCounts = { major: 0, minor: 0, fire: 0, nightDoor: 0, active: 0 };
      allAlarms.forEach((a: any) => {
        const desc = (a.alarm_desc || a.alarm_name || '').toUpperCase();
        const status = a.alarm_status || (a.end_time ? 'Closed' : 'Open');
        const start = a.start_time || a.create_dt;
        const hr = start ? new Date(start).getHours() : 12;

        if (status === 'Open') aCounts.active++;
        if (desc.includes('FIRE') || desc.includes('SMOKE') || desc.includes('FSMK')) aCounts.fire++;
        else if (desc.includes('DOOR') && (hr >= 22 || hr < 6)) aCounts.nightDoor++;
        else if (desc.includes('MAINS') || desc.includes('BATTERY') || desc.includes('DG') || desc.includes('TEMP')) aCounts.major++;
        else aCounts.minor++;
      });
      setAlarmKpi(aCounts);

    } catch (e) {
      console.log('Dashboard Load Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderMiniKPI = (label: string, value: any, color: string, screen: string, params?: any) => (
    <TouchableOpacity
      style={styles.miniKpi}
      onPress={() => navigation.navigate(screen as any, params || {})}
    >
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, { color }]}>{value !== undefined ? value : 0}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3c72" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)}>
          <Icon name="menu" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DASHBOARD</Text>
        <TouchableOpacity onPress={fetchDashboardData}>
          <Icon name="refresh-cw" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <Sidebar
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={navigation}
        fullname={fullname}
        handleLogout={async () => {
          await AsyncStorage.removeItem('user_fullname');
          await logoutApi();
          navigation.replace('Login');
        }}
        activeRoute="Dashboard"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} />}
      >
        <Text style={styles.sectionTitle}>Real-Time Monitoring</Text>

        {/* --- MODULE 1: LIVE ALARMS (4 Main Boxes) --- */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('LiveAlarms', { severity: 'Open' })}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <Icon name="bell" size={20} color="#ed4040" />
              <Text style={styles.cardTitle}> Live Alarm Feed</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            {renderMiniKPI('Active', alarmKpi.active, '#ed4040', 'LiveAlarms', { severity: 'Open' })}
            {renderMiniKPI('Major', alarmKpi.major, '#f9a120', 'LiveAlarms', { severity: 'Major' })}
            {renderMiniKPI('Fire', alarmKpi.fire, '#ff0000', 'LiveAlarms', { severity: 'Fire' })}
            {renderMiniKPI('Night', alarmKpi.nightDoor, '#8a2be2', 'LiveAlarms', { severity: 'NightDoor' })}
          </View>
        </TouchableOpacity>

        {/* --- MODULE 2: SITE VITALS (6 Counts logic) --- */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('SiteVitals', { range: 'all' })}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <Icon name="activity" size={20} color="#3b82f6" />
              <Text style={styles.cardTitle}> Site Battery Vitals</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            {renderMiniKPI('Critical', vitalsCounts?.critical?.count, '#ed4040', 'SiteVitals', { range: 'critical' })}
            {renderMiniKPI('At Risk', vitalsCounts?.low?.count, '#014F86', 'SiteVitals', { range: 'low' })}
            {renderMiniKPI('Operat.', vitalsCounts?.normal?.count, '#2A6F97', 'SiteVitals', { range: 'normal' })}
          </View>
          <View style={{ height: 15 }} />
          <View style={styles.statsRow}>
            {renderMiniKPI('High', vitalsCounts?.high?.count, '#61A5C2', 'SiteVitals', { range: 'high' })}
            {renderMiniKPI('NA', vitalsCounts?.nc?.count, '#9e9e9e', 'SiteVitals', { range: 'na' })}
            {renderMiniKPI('Offline', vitalsCounts?.noncomm?.count, '#ef4444', 'SiteVitals', { range: 'noncomm' })}
          </View>
        </TouchableOpacity>

        {/* --- MODULE 3: UPTIME SUMMARY (MTD) --- */}
        <TouchableOpacity
          style={styles.mainCard}
          onPress={() => navigation.navigate('UptimeReport')}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <Icon name="trending-up" size={20} color="#01497C" />
              <Text style={styles.cardTitle}> Uptime Summary (MTD)</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <View style={styles.miniKpi}>
              <Text style={styles.miniLabel}>States</Text>
              <Text style={[styles.miniValue, { color: '#1e3c72' }]}>{uptimeKpi?.total_states || 0}</Text>
            </View>
            <View style={styles.miniKpi}>
              <Text style={styles.miniLabel}>SLA Met</Text>
              <Text style={[styles.miniValue, { color: '#4caf50' }]}>{uptimeKpi?.total_met || 0}</Text>
            </View>
            <View style={styles.miniKpi}>
              <Text style={styles.miniLabel}>SLA Not Met</Text>
              <Text style={[styles.miniValue, { color: '#f44336' }]}>{uptimeKpi?.total_not_met || 0}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {/* --- MODULE 4: SITE HEALTH --- */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('SiteHealth')}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <Icon name="heart" size={20} color="#10b981" />
              <Text style={styles.cardTitle}> Communication Status</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            {renderMiniKPI('UP', healthKpi?.up_sites, '#10b981', 'SiteHealth', { status: 'up' })}
            {renderMiniKPI('DOWN', healthKpi?.down_sites, '#ef4444', 'SiteHealth', { status: 'down' })}
            {renderMiniKPI('NON-COMM', healthKpi?.non_comm_sites, '#f59e0b', 'SiteHealth', { status: 'non_comm' })}
          </View>
        </TouchableOpacity>

        {/* --- MODULE 5: AUTOMATION --- */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('SiteAutomation')}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <Icon name="cpu" size={20} color="#61A5C2" />
              <Text style={styles.cardTitle}> Automation Status</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <View style={styles.miniKpi}><Text style={styles.miniLabel}>Automated</Text><Text style={[styles.miniValue, { color: '#61A5C2' }]}>{autoKpi?.under_automation || 0}</Text></View>
            <View style={styles.miniKpi}><Text style={styles.miniLabel}>Manual</Text><Text style={[styles.miniValue, { color: '#64748b' }]}>{autoKpi?.not_under_automation || 0}</Text></View>
            <View style={styles.miniKpi}><Text style={styles.miniLabel}>Rate</Text><Text style={[styles.miniValue, { color: '#10b981' }]}>{autoKpi?.automation_percentage || 0}%</Text></View>
          </View>
        </TouchableOpacity>

        {loading && <ActivityIndicator color="#1e3c72" style={{ marginVertical: 10 }} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c5d4eeff' },
  header: { backgroundColor: '#1e3c72', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 30 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e3c72', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  mainCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 4 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1e3c72' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  miniKpi: { alignItems: 'center', flex: 1 },
  miniLabel: { fontSize: 10, color: '#888', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  miniValue: { fontSize: 17, fontWeight: '800' }
});