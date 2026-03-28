import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { api, logoutApi } from '../../api';
import Icon from 'react-native-vector-icons/Feather';
import Sidebar from '../../components/Sidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import { moderateScale, responsiveFontSize, verticalScale, scale } from '../../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

// ─── EXACT SAME SEVERITY MAPS AS WEBSITE ────────────────────────────────────
const smpsAlarmSeverityMap: Record<string, string> = {
  'HIGH_TEMPERATURE': 'Major',
  'FIRE_and_SMOKE': 'Fire',
  'LOW_BATTERY_VOLTAGE': 'Major',
  'MAINS_FAIL': 'Major',
  'DG_ON': 'Major',
  'DG_Failed_to_start': 'Major',
  'SITE_ON_BATTERY': 'Major',
  'EMERGENCY_FAULT': 'Minor',
  'ALTERNATOR_FAULT': 'Minor',
  'DG_OVERLOAD': 'Minor',
  'DG_FUEL_LEVEL_LOW1': 'Minor',
  'DG_FUEL_LEVEL_LOW2': 'Minor',
  'LLOP_FAULT': 'Minor',
  'DG_Failed_to_stop': 'Minor',
  'DOOR_ALARM': 'Minor',
  'reserve': 'Minor',
};

const tpmsAlarmSeverityMap: Record<string, string> = {
  'BB Loop Break': 'Major', 'BB1 DisConnect': 'Major', 'BB2 Disconnect': 'Major',
  'BB3 Disconnect': 'Major', 'BB4 Disconnect': 'Major', 'Extra Alarm': 'Minor',
  'SOBT': 'Minor', 'Rectifier Fail': 'Major', 'RRU Disconnect': 'Major',
  'BTS Open': 'Major', 'RTN Open': 'Major', 'Door-Open': 'Minor',
  'Shelter Loop Break': 'Major', 'Fiber cut': 'Major', 'camera alarm': 'Major',
  'BTS CABLE CUT': 'Major', 'cable loop break': 'Major', 'Motion 1': 'Minor',
  'Motion 2': 'Minor', 'Fiber Cabinet open': 'Major', 'DG Battery Disconnected': 'Major',
  'RTN cabinet open': 'Major', 'airtel odc rack': 'Major', 'idea odc rack': 'Major',
  'Idea BTS Cabinet': 'Major', 'Airtel BTS Cabinet': 'Major', 'Door-Open 2': 'Minor',
  'Solar Voltage Sensing': 'Major', 'Solar Loop Break': 'Major',
  'AC 1 Fail': 'Major', 'AC 2 Fail': 'Major', 'AC 3 Fail': 'Major', 'AC 4 Fail': 'Major',
  'Fire and smoke 1': 'Fire', 'fire and smoke 2': 'Fire',
  'High Temperature': 'Major', 'DC Battery low': 'Major', 'Mains Failed': 'Major',
  'Moter 1 Loop Break': 'Major', 'Moter 2 Loop Break': 'Major', 'DG on Load': 'Minor',
  'Starter Cabinet Open': 'Major', 'Site Battery Low': 'Major', 'DG Common Fault': 'Major',
  'Site On Battery': 'Major', 'BB Cabinet Door Open': 'Major',
  'OAD Shelter Loop Break': 'Major', 'OAD RRU Disconnect': 'Major',
  'OAD BB Cabinet Door Open': 'Minor', 'OAD BTS Open': 'Major',
  'OAD BTS 1 Open': 'Major', 'OAD BTS 2 Open': 'Major',
  'PUMP 1': 'Minor', 'Pump 2': 'Minor', 'Pump 3': 'Minor',
  'B LVD Cut': 'Major', 'L LVD Cut': 'Major', 'Dg door open': 'Minor',
  'DG BATTERY LOOPING': 'Major', 'RF CABLE DISCONNECT': 'Major',
  'Motion 3': 'Minor', 'Motion 4': 'Minor',
  'Vibration sensor 1': 'Minor', 'Vibration sensor2': 'Minor',
  'Servo cabinet open': 'Major', 'Vibration Sensor 3': 'Minor',
  'Vibration sensor 4': 'Minor', 'Vibration sensor 5': 'Minor',
  'mains voltage trip': 'Major', 'DG Faild to start': 'Major', 'DG Faild to OFF': 'Major',
  'Door Open': 'Minor', 'TPMS Battery Low': 'Major', 'Hooter': 'Major',
  'FSMK': 'Major', 'DOPN': 'Minor', 'TPMS Supply Failed': 'Minor',
  'MOTN': 'Major', 'AM MNSF': 'Major', 'BTLV': 'Major',
};

function isNightTime(timestamp: string | null): boolean {
  if (!timestamp) return false;
  const hr = new Date(timestamp).getHours();
  return hr >= 22 || hr < 6;
}

function isDoorAlarm(field: string, name: string): boolean {
  if (field === 'DOOR_ALARM') return true;
  const lower = (name || '').toLowerCase();
  return ['door-open', 'door open', 'dopn', 'door_open'].some(p => lower.includes(p));
}

// ─── EXACT SAME getSeverity LOGIC AS WEBSITE ────────────────────────────────
function getSeverityFromAlarm(alarm: any): string {
  const alarmType = alarm.alarm_type; // 'smps' or 'tpms'
  const timestamp = alarm.created_dt || alarm.create_dt || alarm.start_time || null;

  if (alarmType === 'tpms') {
    const alarmName = alarm.alarm_name || alarm.alarm_desc || '';
    const lower = alarmName.toLowerCase();
    if (lower.includes('fire') || lower.includes('smoke') || lower.includes('fsmk')) return 'Fire';
    if (isDoorAlarm('', alarmName) && isNightTime(timestamp)) return 'NightDoor';
    return tpmsAlarmSeverityMap[alarmName] || 'Minor';
  } else {
    // SMPS — check active_alarms and closed_alarms arrays (same as website)
    const activeAlarms = alarm.active_alarms || [];
    const closedAlarms = alarm.closed_alarms || [];
    const allAlarms = [...activeAlarms, ...closedAlarms];

    // Also handle flat alarm_desc / alarm_field for FastRealTimeAlarmList responses
    if (allAlarms.length === 0) {
      const field = alarm.alarm_field || alarm.alarm_desc || alarm.alarm_name || 'reserve';
      if (field === 'FIRE_and_SMOKE') return 'Fire';
      if (isDoorAlarm(field, field) && isNightTime(timestamp)) return 'NightDoor';
      return smpsAlarmSeverityMap[field] || 'Minor';
    }

    for (const item of allAlarms) {
      if (item.field === 'FIRE_and_SMOKE') return 'Fire';
      if (isDoorAlarm(item.field, item.name) && isNightTime(timestamp)) return 'NightDoor';
    }

    let highest = 'Minor';
    for (const item of allAlarms) {
      const sev = smpsAlarmSeverityMap[item.field] || 'Minor';
      if (sev === 'Major') highest = 'Major';
    }
    return highest;
  }
}

export default function DashboardScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [fullname, setFullname] = useState('Administrator');

  const [healthKpi, setHealthKpi] = useState<any>(null);
  const [vitalsCounts, setVitalsCounts] = useState<any>(null);
  const [autoKpi, setAutoKpi] = useState<any>(null);
  const [uptimeKpi, setUptimeKpi] = useState<any>(null);
  const [alarmKpi, setAlarmKpi] = useState({ major: 0, minor: 0, fire: 0, nightDoor: 0 });

  useEffect(() => {
    const loadName = async () => {
      const storedName = await AsyncStorage.getItem('user_fullname');
      if (storedName) setFullname(storedName);
    };
    loadName();
  }, []);

  useFocusEffect(
    useCallback(() => { fetchDashboardData(); }, [])
  );

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [healthRes, vitalsRes, autoRes, uptimeRes, smpsRes, rmsRes] = await Promise.all([
        api.getSiteHealthCounts({}),
        api.getBatteryVitalsCounts({}),
        api.getAutomationStatus({}),
        api.getUptimeSummary({}),
        api.getSmpsAlarms({}),
        api.getRmsAlarms({}),
      ]);

      if (healthRes) setHealthKpi(healthRes);
      if (vitalsRes) setVitalsCounts(vitalsRes);
      if (autoRes?.status === 'success') setAutoKpi(autoRes.data);

      if (uptimeRes?.status === 'success') {
        const report = uptimeRes.state_report || [];
        setUptimeKpi({
          ...uptimeRes.summary,
          total_met: report.reduce((s: number, r: any) => s + (r.sites_met_sla || 0), 0),
          total_not_met: report.reduce((s: number, r: any) => s + (r.sites_not_met_sla || 0), 0),
        });
      }

      // ── Build combined alarm list exactly like website ──
      const smpsRaw = Array.isArray(smpsRes) ? smpsRes : (smpsRes?.data || []);
      const rmsRaw = Array.isArray(rmsRes) ? rmsRes : (rmsRes?.status === 'success' ? rmsRes.data : []);

      const smpsTagged = smpsRaw.map((a: any) => ({ ...a, alarm_type: 'smps' }));
      const rmsTagged = rmsRaw.map((a: any) => ({ ...a, alarm_type: 'tpms' }));
      const allAlarms = [...smpsTagged, ...rmsTagged];

      const counts = { major: 0, minor: 0, fire: 0, nightDoor: 0 };
      allAlarms.forEach((alarm: any) => {
        const sev = getSeverityFromAlarm(alarm);
        if (sev === 'Fire') counts.fire++;
        else if (sev === 'NightDoor') counts.nightDoor++;
        else if (sev === 'Major') counts.major++;
        else counts.minor++;
      });
      setAlarmKpi(counts);

    } catch (e) {
      console.log('Dashboard Load Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderMiniKPI = (
    label: string, value: any, color: string, screen: string, params?: any
  ) => (
    <TouchableOpacity
      style={styles.miniKpi}
      onPress={() => navigation.navigate(screen as any, params || {})}
    >
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, { color }]}>{value ?? 0}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="DASHBOARD"
        leftAction="menu"
        onLeftPress={() => setSidebarVisible(true)}
        rightActions={[{ icon: 'refresh-cw', onPress: fetchDashboardData }]}
      />

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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchDashboardData(); }}
          />
        }
      >
        <Text style={styles.sectionTitle}>Real-Time Monitoring</Text>

        {/* 1. SITE HEALTH */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('SiteHealth')}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <Icon name="heart" size={20} color="#10b981" style={{ marginRight: 10 }} />
              <Text style={styles.cardTitle}>Site Health</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#1e3c72" />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            {renderMiniKPI('UP', healthKpi?.up_sites, '#10b981', 'SiteHealth', { status: 'up' })}
            {renderMiniKPI('DOWN', healthKpi?.down_sites, '#ef4444', 'SiteHealth', { status: 'down' })}
            {renderMiniKPI('NON-COMM', healthKpi?.non_comm_sites, '#f59e0b', 'SiteHealth', { status: 'non_comm' })}
          </View>
        </TouchableOpacity>

        {/* 2. SITE VITALS */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('SiteVitals', { range: 'all' })}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <Icon name="activity" size={20} color="#3b82f6" style={{ marginRight: 10 }} />
              <Text style={styles.cardTitle}>Site Vitals</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#1e3c72" />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            {renderMiniKPI('Critical', vitalsCounts?.critical?.count, '#ed4040', 'SiteVitals', { range: 'critical' })}
            {renderMiniKPI('At Risk', vitalsCounts?.low?.count, '#014F86', 'SiteVitals', { range: 'low' })}
            {renderMiniKPI('Operational', vitalsCounts?.normal?.count, '#2A6F97', 'SiteVitals', { range: 'normal' })}
          </View>
          <View style={{ height: 15 }} />
          <View style={styles.statsRow}>
            {renderMiniKPI('Normal', vitalsCounts?.high?.count, '#61A5C2', 'SiteVitals', { range: 'high' })}
            {renderMiniKPI('NA', vitalsCounts?.nc?.count, '#9e9e9e', 'SiteVitals', { range: 'na' })}
            {renderMiniKPI('Offline', vitalsCounts?.noncomm?.count, '#ef4444', 'SiteVitals', { range: 'noncomm' })}
          </View>
        </TouchableOpacity>

        {/* 3. SITE OPEN ALARM ANALYTICS — Major / Minor / Fire / Night (NO Active) */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('LiveAlarms', { severity: 'all' })}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <Icon name="bell" size={20} color="#ed4040" style={{ marginRight: 10 }} />
              <Text style={styles.cardTitle}>Site Open Alarm Analytics</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#1e3c72" />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            {renderMiniKPI('Major', alarmKpi.major, '#f9a120', 'LiveAlarms', { severity: 'Major' })}
            {renderMiniKPI('Minor', alarmKpi.minor, '#eab308', 'LiveAlarms', { severity: 'Minor' })}
            {renderMiniKPI('Fire', alarmKpi.fire, '#ef4444', 'LiveAlarms', { severity: 'Fire' })}
            {renderMiniKPI('Night', alarmKpi.nightDoor, '#8b5cf6', 'LiveAlarms', { severity: 'NightDoor' })}
          </View>
        </TouchableOpacity>

        {/* 4. UPTIME SUMMARY */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('UptimeReport')}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <Icon name="trending-up" size={20} color="#01497C" style={{ marginRight: 10 }} />
              <Text style={styles.cardTitle}>Uptime Summary (RMS Data-MTD)</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#1e3c72" />
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

        {/* 5. SITE AUTOMATION STATUS */}
        <TouchableOpacity style={styles.mainCard} onPress={() => navigation.navigate('SiteAutomation')}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <Icon name="cpu" size={20} color="#61A5C2" style={{ marginRight: 10 }} />
              <Text style={styles.cardTitle}>Site Automation Status</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#1e3c72" />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <View style={styles.miniKpi}>
              <Text style={styles.miniLabel}>Automated</Text>
              <Text style={[styles.miniValue, { color: '#61A5C2' }]}>{autoKpi?.under_automation || 0}</Text>
            </View>
            <View style={styles.miniKpi}>
              <Text style={styles.miniLabel}>Manual</Text>
              <Text style={[styles.miniValue, { color: '#64748b' }]}>{autoKpi?.not_under_automation || 0}</Text>
            </View>
            <View style={styles.miniKpi}>
              <Text style={styles.miniLabel}>Rate</Text>
              <Text style={[styles.miniValue, { color: '#10b981' }]}>{autoKpi?.automation_percentage || 0}%</Text>
            </View>
          </View>
        </TouchableOpacity>

        {loading && <ActivityIndicator color="#1e3c72" style={{ marginVertical: 10 }} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c5d4eeff' },
  scrollContent: {
    padding: moderateScale(16),
    maxWidth: 650,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: verticalScale(30),
  },
  sectionTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: '#1e3c72',
    marginBottom: verticalScale(16),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: verticalScale(16),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: responsiveFontSize(14), fontWeight: '700', color: '#1e3c72' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: verticalScale(12) },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  miniKpi: { alignItems: 'center', flex: 1 },
  miniLabel: {
    fontSize: responsiveFontSize(10),
    color: '#888',
    fontWeight: 'bold',
    marginBottom: verticalScale(4),
    textTransform: 'uppercase',
  },
  miniValue: { fontSize: responsiveFontSize(17), fontWeight: '800' },
});