import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { api } from '../api';

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
      const res = await api.getSiteDetails(imei);
      if (res.status === 'success') {
        setData(res.data);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3c72" />
        <Text style={styles.loadingText}>Loading Site Details...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>Error loading data.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtnText}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  // --- TAB RENDERERS ---
  const renderOverview = () => (
    <View style={styles.card}>
      <DetailRow label="Client Name" value={data.client_name} label2="State" value2={data.state_name} />
      <DetailRow label="Site ID" value={data.site_id} label2="Global ID" value2={data.global_id} />
      <DetailRow label="IMEI" value={data.imei} label2="Site Name" value2={data.site_name} />
      <DetailRow label="District" value={data.district_name} label2="Cluster" value2={data.cluster_name} />
      <DetailRow label="Install Date" value={data.installation_date} label2="System Type" value2={data.system_version_type} />
      
      <Text style={styles.sectionTitle}>Channel Config</Text>
      <View style={styles.channelRow}>
        <View style={styles.channelBox}><Text style={styles.chLabel}>CH1</Text><Text style={styles.chValue}>{data.channels.ch1 || '-'}</Text></View>
        <View style={styles.channelBox}><Text style={styles.chLabel}>CH2</Text><Text style={styles.chValue}>{data.channels.ch2 || '-'}</Text></View>
        <View style={styles.channelBox}><Text style={styles.chLabel}>CH3</Text><Text style={styles.chValue}>{data.channels.ch3 || '-'}</Text></View>
        <View style={styles.channelBox}><Text style={styles.chLabel}>CH4</Text><Text style={styles.chValue}>{data.channels.ch4 || '-'}</Text></View>
      </View>
    </View>
  );

  const renderTechnical = () => {
    // Find first non-empty battery bank capacity
    let bbCapacity = '--';
    for (const key in data.battery_banks) {
        if (data.battery_banks[key]) { bbCapacity = data.battery_banks[key]; break; }
    }

    return (
      <View>
        {/* Capacity Cards */}
        <View style={styles.capacityRow}>
            <View style={styles.capacityCard}><Text style={styles.capLabel}>EB Capacity</Text><Text style={styles.capValue}>-- kVA</Text></View>
            <View style={styles.capacityCard}><Text style={styles.capLabel}>DG Capacity</Text><Text style={styles.capValue}>-- kVA</Text></View>
            <View style={styles.capacityCard}><Text style={styles.capLabel}>BB Capacity</Text><Text style={styles.capValue}>{bbCapacity}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mains Parameters</Text>
          <DetailRow label="Voltage R (Vac)" value={data.mains_parameters.voltage_r} label2="Voltage Y (Vac)" value2={data.mains_parameters.voltage_y} />
          <DetailRow label="Voltage B (Vac)" value={data.mains_parameters.voltage_b} label2="Frequency (Hz)" value2={data.mains_parameters.frequency} />
          <DetailRow label="Cumulative KWH" value={data.mains_parameters.cumulative_energy} label2="" value2="" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DG Parameters</Text>
          <DetailRow label="Voltage R (Vac)" value={data.dg_parameters.voltage_r} label2="Voltage Y (Vac)" value2={data.dg_parameters.voltage_y} />
          <DetailRow label="Voltage B (Vac)" value={data.dg_parameters.voltage_b} label2="Frequency (Hz)" value2={data.dg_parameters.frequency} />
          <DetailRow label="Cumulative KWH" value={data.dg_parameters.cumulative_energy} label2="" value2="" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Battery Parameters</Text>
          <DetailRow label="Battery Voltage (Vdc)" value={data.battery_parameters.voltage} label2="Battery Current (Amp.)" value2={data.battery_parameters.current} />
        </View>
      </View>
    );
  }

  const renderMonitoring = () => {
    const isDoorOpen = data.tpms_alarms.includes('H Door Open') || data.tpms_alarms.includes('Door Open') || data.tpms_alarms.includes('AM Door Open');
    
    return (
      <View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Hardware Info</Text>
          <DetailRow label="No. Of RRU" value={data.inc_details.no_of_rru} label2="No. Of BTS" value2={data.inc_details.no_of_bts} />
          <DetailRow label="No. Of Battery Bank" value={data.inc_details.no_of_battery_bank} label2="Door Sensor" value2={data.inc_details.door_sensor == 1 ? 'Available' : 'Not Available'} />
          <DetailRow label="Antenna" value={data.inc_details.antenna == 1 ? 'Available' : 'Not Available'} label2="Hooter" value2={data.inc_details.hooter == 1 ? 'Available' : 'Not Available'} />
          <DetailRow label="SOW Status" value={data.inc_details.sow_status} label2="" value2="" />
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <DetailRow label="System Status" value={data.status === 'Non Active' ? 'Offline' : 'Online'} label2="Communication" value2={data.status === 'Non Active' ? 'Inactive' : 'Active'} />
          <DetailRow label="Temperature" value={`${data.load_parameters.room_temperature || '--'}°C`} label2="Power Supply" value2={data.load_parameters.site_mode} />
          <DetailRow label="Door Status" value={isDoorOpen ? 'Open' : 'Closed'} label2="" value2="" />
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>TPMS Connectivity</Text>
          <DetailRow label="Battery Bank" value={data.inc_details.tpms_battery_bank == 1 ? '✅ Connected' : '❌ Disconnected'} label2="RRU" value2={data.inc_details.tpms_rru == 1 ? '✅ Connected' : '❌ Disconnected'} />
          <DetailRow label="BTS" value={data.inc_details.tpms_bts == 1 ? '✅ Connected' : '❌ Disconnected'} label2="CABLE" value2={data.inc_details.tpms_cable == 1 ? '✅ Connected' : '❌ Disconnected'} />
          <DetailRow label="DG" value={data.inc_details.tpms_dg == 1 ? '✅ Connected' : '❌ Disconnected'} label2="" value2="" />
        </View>
      </View>
    );
  }

  const renderContacts = () => (
    <View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Site Contact Details</Text>
        {data.contacts.length === 0 ? <Text style={styles.emptyText}>No contact information available</Text> : 
          data.contacts.map((c: any, i: number) => (
            <DetailRow key={i} label={`Level ${c.level}`} value={`${c.name} (${c.designation})`} label2="Mobile" value2={c.mobile} />
          ))
        }
        
        {data.technician && data.technician.name && (
          <View style={styles.techBox}>
            <Text style={styles.sectionTitle}>Technician</Text>
            <DetailRow label="Name" value={data.technician.name} label2="Mobile" value2={data.technician.mobile} />
            <DetailRow label="Supervisor" value={data.technician.supervisor} label2="" value2="" />
          </View>
        )}
      </View>
      
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Escalation Matrix</Text>
        {['1','2','3','4','5'].map(lvl => {
            const name = data.escalation[`l${lvl}_name`];
            const num = data.escalation[`l${lvl}_number`];
            if(num) return <DetailRow key={lvl} label={`Level ${lvl}`} value={`${name ? name + ' - ' : ''}${num}`} label2="" value2="" />;
            return null;
        })}
        {(!data.escalation.l1_number && !data.escalation.l2_number) && <Text style={styles.emptyText}>No escalation matrix available</Text>}
      </View>
    </View>
  );

  const renderAlarms = () => (
    <View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Configured Alarms</Text>
        {data.tpms_alarms.length === 0 ? <Text style={styles.emptyText}>No configured alarms</Text> : 
          <View style={styles.badgeContainer}>
            {data.tpms_alarms.map((alarm: string, i: number) => (
              <View key={i} style={styles.configBadge}><Text style={styles.configBadgeText}>{alarm}</Text></View>
            ))}
          </View>
        }
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Active Alarms</Text>
        {data.current_alarms.length === 0 ? <Text style={styles.emptyText}>No active alarms</Text> : 
          data.current_alarms.map((a: any, i: number) => (
            <View key={i} style={styles.alarmBoxActive}>
              <Text style={styles.alarmName}>{a.name}</Text>
              <Text style={styles.alarmTime}>{a.active_time_formatted} ago • {a.start_time ? new Date(a.start_time).toLocaleString() : ''}</Text>
            </View>
          ))
        }
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recently Closed</Text>
        {data.closed_alarms.length === 0 ? <Text style={styles.emptyText}>No closed alarms today</Text> : 
          data.closed_alarms.map((a: any, i: number) => (
            <View key={i} style={styles.alarmBoxClosed}>
              <Text style={styles.alarmName}>{a.name}</Text>
              <Text style={styles.alarmTime}>Duration: {a.duration_formatted} • {a.end_time ? new Date(a.end_time).toLocaleString() : ''}</Text>
            </View>
          ))
        }
      </View>
    </View>
  );

  const renderParameters = () => (
    <View style={styles.card}>
       <Text style={styles.sectionTitle}>Setting Parameters</Text>
       <DetailRow label="Battery LVD Trip" value={data.settings_parameters.battery_lvd_trip} label2="Load LVD Trip" value2={data.settings_parameters.load_lvd_trip} />
       <DetailRow label="Battery Low Alarm" value={data.settings_parameters.battery_low_alarm} label2="VRLA AH Setting" value2={data.settings_parameters.vrla_ah_setting} />
       <DetailRow label="VRLA Charging Cur" value={data.settings_parameters.vrla_charging_current} label2="LIB Charging Cur" value2={data.settings_parameters.lib_charging_current} />
       
       <Text style={[styles.sectionTitle, {marginTop: 20}]}>Load Parameters</Text>
       <DetailRow label="Site Mode" value={data.load_parameters.site_mode} label2="Room Temp" value2={`${data.load_parameters.room_temperature || '--'} °C`} />
       <DetailRow label="CH1 Energy" value={data.load_parameters.ch1_energy} label2="CH2 Energy" value2={data.load_parameters.ch2_energy} />
       <DetailRow label="CH3 Energy" value={data.load_parameters.ch3_energy} label2="CH4 Energy" value2={data.load_parameters.ch4_energy} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{data.site_name}</Text>
          <Text style={styles.headerSub}>{data.site_id} | {data.status}</Text>
        </View>
      </View>

      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {['Overview', 'Technical', 'I&C Details', 'Contacts', 'Alarms', 'Parameters'].map(tab => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'Overview' && renderOverview()}
        {activeTab === 'Technical' && renderTechnical()}
        {activeTab === 'I&C Details' && renderMonitoring()}
        {activeTab === 'Contacts' && renderContacts()}
        {activeTab === 'Alarms' && renderAlarms()}
        {activeTab === 'Parameters' && renderParameters()}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Simple Helper Component to render two columns of data cleanly
const DetailRow = ({ label, value, label2, value2 }: any) => (
  <View style={styles.detailRow}>
    <View style={styles.detailCol}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value || '--'}</Text></View>
    <View style={styles.detailCol}><Text style={styles.label}>{label2}</Text><Text style={styles.value}>{value2 || '--'}</Text></View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#1e3c72', fontWeight: '600' },
  
  header: { backgroundColor: '#1e3c72', padding: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { paddingRight: 15 },
  backArrow: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#89C2D9', fontSize: 13, marginTop: 2 },
  
  tabsWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  tabsContainer: { paddingHorizontal: 10 },
  tab: { paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: 3, borderColor: 'transparent' },
  tabActive: { borderColor: '#1e3c72' },
  tabText: { color: '#666', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#1e3c72' },
  
  content: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e3c72', marginBottom: 16, marginTop: 8 },
  
  detailRow: { flexDirection: 'row', marginBottom: 16 },
  detailCol: { flex: 1, paddingRight: 10 },
  label: { fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 14, color: '#333', fontWeight: '500' },
  
  channelRow: { flexDirection: 'row', gap: 10 },
  channelBox: { flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee', alignItems: 'center' },
  chLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  chValue: { fontSize: 14, fontWeight: '700', color: '#1e3c72' },

  capacityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 10 },
  capacityCard: { flex: 1, backgroundColor: '#1e3c72', padding: 15, borderRadius: 12, alignItems: 'center' },
  capLabel: { color: '#89C2D9', fontSize: 11, textTransform: 'uppercase', marginBottom: 5, fontWeight: '600'},
  capValue: { color: '#fff', fontSize: 16, fontWeight: '700'},

  techBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#eee' },

  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  configBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  configBadgeText: { color: '#3730a3', fontSize: 12, fontWeight: '600' },

  alarmBoxActive: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderColor: '#ef4444', marginBottom: 10 },
  alarmBoxClosed: { backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderColor: '#22c55e', marginBottom: 10 },
  alarmName: { fontWeight: '700', color: '#333', fontSize: 14 },
  alarmTime: { fontSize: 12, color: '#666', marginTop: 4 },
  emptyText: { color: '#888', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 }
});