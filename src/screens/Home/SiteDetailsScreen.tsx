import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, SafeAreaView, StatusBar, Linking
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { api } from '../../api';

type Props = NativeStackScreenProps<RootStackParamList, 'SiteDetails'>;

export default function SiteDetailsScreen({ route, navigation }: Props) {
  const { imei, siteId } = route.params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    fetchDetails();
  }, []);

  const fetchDetails = async () => {
    try {
      let activeImei = imei;
      let activeSiteId = siteId;

      console.log(`Starting fetchDetails for SiteID: ${activeSiteId}, IMEI: ${activeImei}`);

      // 1. Critical Fallback: If IMEI is truly empty or invalid, try lookup
      if (!activeImei || activeImei === 'N/A' || activeImei === '-' || activeImei === 'undefined') {
        if (activeSiteId) {
          try {
            console.log("Attempting IMEI lookup via getSiteStatus...");
            // Try searching by site_id first (most common in status table)
            let searchRes = await api.getSiteStatus({ site_id: activeSiteId }, 1, 1);
            
            if (!searchRes || !searchRes.sites?.length) {
              // Try global_id fallback
              searchRes = await api.getSiteStatus({ global_id: activeSiteId }, 1, 1);
            }

            if (searchRes && searchRes.sites?.length > 0) {
              activeImei = searchRes.sites[0].imei;
              console.log(`Found IMEI from lookup: ${activeImei}`);
            }
          } catch (err) {
            console.log("IMEI identification failed", err);
          }
        }
      }

      // 2. Fetch from comprehensive API
      // If we still don't have IMEI, we use siteId as fallback imei param (some backend endpoints allow this)
      const fetchId = (activeImei && activeImei !== 'N/A') ? activeImei : activeSiteId;
      
      if (!fetchId) {
        setLoading(false);
        return;
      }

      console.log(`Calling merge-site-details for ID: ${fetchId}`);
      const res = await api.getSiteDetails(fetchId);
      
      if (res) {
        // Handle various response formats
        const siteData = res.sites?.[0] || res.data?.[0] || res.data || res;
        setData(siteData);
      } else {
        console.log("Empty response from getSiteDetails");
        setData(null);
      }

    } catch (e) {
      console.error("Comprehensive Fetch error:", e);
      // Last ditch: if it's an axios error and we have siteId, try searching again
      if (siteId) {
         try {
           const retryRes = await api.getSiteStatus({ site_name: siteId }, 1, 1);
           if (retryRes && retryRes.sites?.length > 0) {
              const finalRes = await api.getSiteDetails(retryRes.sites[0].imei);
              setData(finalRes.sites?.[0] || finalRes.data || finalRes);
              return;
           }
         } catch(err2) {
           console.log("Retry failed", err2);
         }
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3c72" />
        <Text style={styles.loadingText}>Loading Comprehensive Dashboard...</Text>
      </View>
    );
  }

  if (!data) return <View style={styles.center}><Text>No Data Available</Text></View>;

  // --- RENDER FUNCTIONS FOR EACH TAB ---

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <DetailRow label="Client Type Name" value={data.client_name} label2="State/Circle" value2={data.state_name} />
        <DetailRow label="Site Mobile No." value={data.sim_info?.mobile} label2="Cluster" value2={data.cluster_name} />
        <DetailRow label="SIM Serial No." value={data.sim_info?.serial_no} label2="District" value2={data.district_name} />
        <DetailRow label="GSM IMEI No." value={data.imei} label2="Site Name" value2={data.site_name} />
        <DetailRow label="System Serial No." value={data.system_serial_no} label2="Site Type" value2={data.site_type} />
        <DetailRow label="Site ID (SMS)" value={data.site_id} label2="Global ID" value2={data.global_id} />
        <DetailRow label="Version Type" value={data.system_version_type} label2="EB Load (kVA)" value2="--" />
        <DetailRow label="Installation Date" value={data.installation_date} label2="Device Make" value2="--" />
      </View>

      <View style={styles.card}>
        <DetailRow label="AMF Panel" value="Model No." label2="No. of Rectifiers" value2="--" />
        <DetailRow label="Tenants" value="--" label2="Li-ion Battery" value2="--" />
        <DetailRow label="Max EB Volt" value="--" label2="Min EB Volt" value2="--" />
        <DetailRow label="AVG EB Volt" value="--" label2="BMS" value2="no data" />
        <DetailRow label="VRLA" value="no data" label2="Comm. Date" value2="--" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Channel Configuration</Text>
        <View style={styles.grid}>
          {['ch1', 'ch2', 'ch3', 'ch4', 'ch5'].map((ch, i) => (
            <View key={ch} style={styles.chBox}>
              <Text style={styles.label}>CH{i + 1}</Text>
              <Text style={styles.valStrong}>{data.channels?.[ch] || 'Empty'}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderAlarms = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Configured Alarms</Text>
        {data.tpms_alarms?.map((alarm: string, i: number) => (
          <View key={i} style={styles.alarmListRow}>
            <Text style={styles.alarmListTxt}>{alarm}</Text>
            <View style={styles.badgeConfig}><Text style={styles.badgeText}>Configured</Text></View>
          </View>
        )) || <Text style={styles.empty}>No configured alarms</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Real Time Alarms Status</Text>
        {data.current_alarms?.length > 0 ? data.current_alarms.map((a: any, i: number) => (
          <View key={i} style={styles.alarmRowActive}>
            <View style={{ flex: 1 }}><Text style={styles.boldTxt}>{a.name}</Text><Text style={styles.smallTxt}>{a.timestamp}</Text></View>
            <View style={styles.badgeActive}><Text style={styles.badgeText}>Active</Text></View>
            <Text style={styles.durationTxt}>{a.hours_active} hrs</Text>
          </View>
        )) : <Text style={styles.empty}>No active alarms</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recently Closed Alarms</Text>
        {data.closed_alarms?.length > 0 ? data.closed_alarms.map((a: any, i: number) => (
          <View key={i} style={styles.alarmRowClosed}>
            <View style={{ flex: 1 }}><Text style={styles.boldTxt}>{a.name}</Text><Text style={styles.smallTxt}>{a.end_time}</Text></View>
            <Text style={styles.durationTxt}>{a.duration_formatted}</Text>
          </View>
        )) : <Text style={styles.empty}>No closed alarms today</Text>}
      </View>
    </View>
  );

  const renderTechnical = () => (
    <View style={styles.tabContent}>
      <View style={styles.capacityRow}>
        <CapCard head="EB Capacity" val="-- kVA" sub="Sanctioned Load" />
        <CapCard head="DG Capacity" val="-- kVA" sub="Generator Power" />
        <CapCard head="BB Capacity" val={data.battery_banks?.bank1 || '--'} sub="Battery Bank" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mains Details</Text>
        <DetailRow label="Volt R (Vac)" value={data.mains_parameters?.voltage_r} label2="Volt Y (Vac)" value2={data.mains_parameters?.voltage_y} />
        <DetailRow label="Volt B (Vac)" value={data.mains_parameters?.voltage_b} label2="EB Freq (Hz)" value2={data.mains_parameters?.frequency} />
        <DetailRow label="Today (KWH)" value={data.energy_consumption?.today?.mains} label2="Yest. (KWH)" value2={data.energy_consumption?.yesterday?.mains} />
        <DetailRow label="Cum. Energy" value={data.mains_parameters?.cumulative_energy} label2="Cum. Run Hrs" value2="--" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>DG Parameters</Text>
        <DetailRow label="Volt R (Vac)" value={data.dg_parameters?.voltage_r} label2="Volt Y (Vac)" value2={data.dg_parameters?.voltage_y} />
        <DetailRow label="Volt B (Vac)" value={data.dg_parameters?.voltage_b} label2="DG Freq (Hz)" value2={data.dg_parameters?.frequency} />
        <DetailRow label="Today (KWH)" value={data.energy_consumption?.today?.dg} label2="Cum. Energy" value2={data.dg_parameters?.cumulative_energy} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>BB Details</Text>
        <DetailRow label="Battery Volt" value={data.battery_parameters?.voltage} label2="Battery Cur" value2={data.battery_parameters?.current} />
      </View>
    </View>
  );

  const renderMonitoring = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <StaticRow label="No. Of RRU" value={data.system_details?.no_of_rru} />
        <StaticRow label="No. Of BTS" value={data.system_details?.no_of_bts} />
        <StaticRow label="No. Of Battery Bank" value={data.no_of_battery_bank} />
        <StaticRow label="Door Sensor" value={data.door_sensor == 1 ? 'Available' : 'Not Available'} />
        <StaticRow label="Antenna" value={data.antenna == 1 ? 'Available' : 'Not Available'} />
        <StaticRow label="Hooter" value={data.hooter == 1 ? 'Available' : 'Not Available'} />
        <StaticRow label="SOW Status" value={data.sow_status} />
      </View>

      <View style={styles.card}>
        <StaticRow label="System Status" value={data.status?.includes('Non') ? 'Offline' : 'Online'} />
        <StaticRow label="Communication" value={data.status?.includes('Non') ? 'Inactive' : 'Active'} />
        <StaticRow label="Temperature" value={`${data.environmental?.room_temperature || '--'}°C`} />
        <StaticRow label="Door Status" value={data.tpms_alarms?.includes('Door Open') ? 'Open' : 'Closed'} />
        <StaticRow label="Power Supply" value={data.load_parameters?.site_mode} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>TPMS Connectivity</Text>
        <View style={styles.checkGrid}>
          <CheckItem label="Battery Bank" active={data.tpms_battery_bank == 1} />
          <CheckItem label="RRU" active={data.tpms_rru == 1} />
          <CheckItem label="BTS" active={data.tpms_bts == 1} />
          <CheckItem label="CABLE" active={data.tpms_cable == 1} />
          <CheckItem label="DG" active={data.tpms_dg == 1} />
        </View>
      </View>
    </View>
  );

  const renderParameters = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Run Hr. Trend</Text>
        {data.daily_run_hours?.length > 0 ? (
          <View>
            <StaticRow label="EB Run Hrs" value={data.daily_run_hours[0].eb_duration_formatted} />
            <StaticRow label="DG Run Hrs" value={data.daily_run_hours[0].dg_duration_formatted} />
            <StaticRow label="Battery Run Hrs" value={data.daily_run_hours[0].battery_duration_formatted} />
            <StaticRow label="Date" value={data.daily_run_hours[0].date} />
          </View>
        ) : <Text style={styles.empty}>No trend data</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Setting Parameters</Text>
        <StaticRow label="Battery LVD Trip" value={data.settings_parameters?.battery_lvd_trip} />
        <StaticRow label="Load LVD Trip" value={data.settings_parameters?.load_lvd_trip} />
        <StaticRow label="Battery Low Alarm" value={data.settings_parameters?.battery_low_alarm} />
        <StaticRow label="VRLA AH Setting" value={data.settings_parameters?.vrla_ah_setting} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Load Energy Today (KWH)</Text>
        <DetailRow label="OPCO1" value={data.load_parameters?.ch1_energy} label2="OPCO2" value2={data.load_parameters?.ch2_energy} />
        <DetailRow label="OPCO3" value={data.load_parameters?.ch3_energy} label2="OPCO4" value2={data.load_parameters?.ch4_energy} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3c72" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backArr}>←</Text></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.headTitle}>{data.site_name}</Text>
          <Text style={styles.headSub}>{data.site_id} | {data.status}</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['Overview', 'Alarms', 'Technical', 'I&C Details', 'Parameters'].map(t => (
            <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={[styles.tabBtn, activeTab === t && styles.tabActive]}>
              <Text style={[styles.tabTxt, activeTab === t && styles.tabTxtActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView>
        {activeTab === 'Overview' && renderOverview()}
        {activeTab === 'Alarms' && renderAlarms()}
        {activeTab === 'Technical' && renderTechnical()}
        {activeTab === 'I&C Details' && renderMonitoring()}
        {activeTab === 'Parameters' && renderParameters()}
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- SUB-COMPONENTS ---

const DetailRow = ({ label, value, label2, value2 }: any) => (
  <View style={styles.row}>
    <View style={styles.col}><Text style={styles.miniLabel}>{label}</Text><Text style={styles.miniVal}>{value || '--'}</Text></View>
    <View style={styles.col}><Text style={styles.miniLabel}>{label2}</Text><Text style={styles.miniVal}>{value2 || '--'}</Text></View>
  </View>
);

const StaticRow = ({ label, value }: any) => (
  <View style={styles.staticRow}><Text style={styles.staticLabel}>{label}</Text><Text style={styles.staticVal}>{value || '--'}</Text></View>
);

const CapCard = ({ head, val, sub }: any) => (
  <View style={styles.capCard}><Text style={styles.capHead}>{head}</Text><Text style={styles.capVal}>{val}</Text><Text style={styles.capSub}>{sub}</Text></View>
);

const CheckItem = ({ label, active }: any) => (
  <View style={styles.checkItem}>
    <View style={[styles.check, active && styles.checkOn]}>{active && <Text style={{ color: '#fff' }}>✓</Text>}</View>
    <Text style={styles.checkTxt}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c5d4ee' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#1e3c72', fontWeight: 'bold' },
  header: { backgroundColor: '#1e3c72', padding: 15, flexDirection: 'row', alignItems: 'center' },
  backArr: { color: '#fff', fontSize: 24 },
  headTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  headSub: { color: '#89C2D9', fontSize: 11 },

  tabBar: { backgroundColor: '#fff', elevation: 4 },
  tabBtn: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 3, borderColor: 'transparent' },
  tabActive: { borderColor: '#1e3c72' },
  tabTxt: { color: '#666', fontWeight: 'bold', fontSize: 13 },
  tabTxtActive: { color: '#1e3c72' },
  tabContent: { padding: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#01497C', marginBottom: 15 },
  row: { flexDirection: 'row', marginBottom: 15 },
  col: { flex: 1 },
  miniLabel: { fontSize: 10, color: '#2A6F97', fontWeight: 'bold' },
  miniVal: { fontSize: 13, color: '#333', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chBox: { width: '47%', backgroundColor: '#f0f4f8', padding: 10, borderRadius: 8 },
  valStrong: { fontSize: 13, fontWeight: 'bold', color: '#1e3c72' },
  capacityRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  capCard: { flex: 1, backgroundColor: '#01497C', padding: 10, borderRadius: 10, alignItems: 'center' },
  capHead: { color: '#89C2D9', fontSize: 9, fontWeight: 'bold' },
  capVal: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginVertical: 4 },
  capSub: { color: '#fff', fontSize: 8, opacity: 0.8 },
  staticRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  staticLabel: { color: '#01497C', fontWeight: 'bold', fontSize: 13 },
  staticVal: { color: '#333', fontSize: 13 },
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  check: { width: 20, height: 20, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  checkTxt: { fontSize: 12 },
  label: { fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  alarmListRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
  alarmListTxt: { fontSize: 13, color: '#333' },
  badgeConfig: { backgroundColor: '#2A6F97', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeActive: { backgroundColor: '#dc2626', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  alarmRowActive: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, borderLeftWidth: 4, borderColor: '#dc2626', marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  alarmRowClosed: { backgroundColor: '#f0fdf4', padding: 10, borderRadius: 8, borderLeftWidth: 4, borderColor: '#2e7d32', marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  boldTxt: { fontWeight: 'bold', fontSize: 13 },
  smallTxt: { fontSize: 10, color: '#666' },
  durationTxt: { fontSize: 11, fontWeight: 'bold', marginLeft: 10 },
  empty: { textAlign: 'center', color: '#999', padding: 10 }
});