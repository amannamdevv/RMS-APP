import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { api } from '../api';
import Icon from 'react-native-vector-icons/Feather';

type Props = NativeStackScreenProps<RootStackParamList, 'NonCommSites'>;

const AgingBucket = ({ label, count, color }: { label: string, count: number, color: string }) => (
  <View style={[styles.bucketCard, { borderTopColor: color }]}>
    <Text style={styles.bucketCount}>{count}</Text>
    <Text style={styles.bucketLabel}>{label}</Text>
  </View>
);

export default function NonCommSitesScreen({ navigation }: Props) {
  const [sites, setSites] = useState<any[]>([]);
  const [buckets, setBuckets] = useState<any>(null);
  const [totalSites, setTotalSites] = useState(0);
  
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (pageNum = 1, isRefresh = false) => {
    if (loading && !isRefresh) return;
    setLoading(true);
    
    try {
      // Fetch buckets on first load only
      if (pageNum === 1) {
        const bucketRes = await api.getNonCommAging({});
        if (bucketRes.status === 'success') {
          setBuckets(bucketRes.data.aging_buckets);
          setTotalSites(bucketRes.data.total_non_comm);
        }
      }

      // Fetch Paginated List
      const listRes = await api.getNonCommSitesList({}, pageNum, 10);
      if (listRes.status === 'success') {
        if (isRefresh) setSites(listRes.data);
        else setSites(prev => [...prev, ...listRes.data]);
        
        setHasNext(listRes.has_next);
        setPage(pageNum);
      }
    } catch (e) {
      console.log('Error fetching non comm sites:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(1, true); }, []);

  const getDaysColor = (days: number | null) => {
    if (days === null || days > 7) return '#dc2626'; // Red
    if (days > 3) return '#ea580c'; // Orange
    return '#ca8a04'; // Yellow
  };

  const renderSiteCard = ({ item }: { item: any }) => {
    const daysColor = getDaysColor(item.days_since_comm);
    const isCritical = item.days_since_comm === null || item.days_since_comm > 7;

    return (
      <View style={[styles.card, isCritical && styles.cardCritical]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.siteName}>{item.site_name}</Text>
            <Text style={styles.siteId}>{item.site_id} | {item.imei}</Text>
          </View>
          <View style={[styles.daysBadge, { backgroundColor: daysColor + '20', borderColor: daysColor }]}>
            <Text style={[styles.daysBadgeText, { color: daysColor }]}>
              {item.days_since_comm ? `${item.days_since_comm} days offline` : 'Never comm'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>Location</Text><Text style={styles.infoValue}>{item.state_name} / {item.district_name}</Text></View>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>Last Comm</Text><Text style={styles.infoValue}>{item.last_communication || 'Never'}</Text></View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>Battery (V)</Text><Text style={styles.infoValue}>{item.battery_v ? `${item.battery_v}V` : 'N/A'}</Text></View>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>Signal (dBm)</Text><Text style={styles.infoValue}>{item.signal_strength || 'N/A'}</Text></View>
        </View>

        {item.recent_alarms && item.recent_alarms.length > 0 && (
          <View style={styles.alarmsWrapper}>
            <Text style={styles.alarmsTitle}>Last Known Alarms ({item.recent_alarms.length})</Text>
            {item.recent_alarms.map((alarm: any, idx: number) => (
              <View key={idx} style={styles.alarmItem}>
                <Icon name="alert-triangle" size={14} color="#dc2626" />
                <Text style={styles.alarmText}>{alarm.alarm_name}</Text>
                <Text style={styles.alarmDate}>{alarm.create_dt.substring(0, 10)}</Text>
                <Text style={[styles.alarmStatus, alarm.end_time ? styles.statusCleared : styles.statusActive]}>
                  {alarm.end_time ? 'Cleared' : 'Active'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Non-Communicating Sites</Text>
      </View>

      {buckets && (
        <View>
          <Text style={styles.totalText}>Total Offline: {totalSites}</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { label: '0-7 Days', count: buckets['0-7 days'], color: '#ca8a04' },
              { label: '8-30 Days', count: buckets['8-30 days'], color: '#ea580c' },
              { label: '31-60 Days', count: buckets['31-60 days'], color: '#dc2626' },
              { label: '61-90 Days', count: buckets['61-90 days'], color: '#991b1b' },
              { label: '90+ Days', count: buckets['90+ days'], color: '#7f1d1d' }
            ]}
            keyExtractor={(item) => item.label}
            contentContainerStyle={styles.bucketsContainer}
            renderItem={({ item }) => <AgingBucket {...item} />}
          />
        </View>
      )}

      <FlatList
        data={sites}
        keyExtractor={(item, index) => item.imei + index}
        renderItem={renderSiteCard}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(1, true)} />}
        onEndReached={() => hasNext && fetchData(page + 1)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="small" color="#1e3c72" style={{ margin: 20 }} /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: '#1e3c72', padding: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { paddingRight: 15 },
  backArrow: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  
  totalText: { fontSize: 16, fontWeight: '700', color: '#333', paddingHorizontal: 16, marginTop: 16 },
  bucketsContainer: { padding: 16, gap: 10 },
  bucketCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, minWidth: 90, alignItems: 'center', elevation: 2, borderTopWidth: 4 },
  bucketCount: { fontSize: 20, fontWeight: '800', color: '#1e3c72' },
  bucketLabel: { fontSize: 11, color: '#666', marginTop: 4, fontWeight: '600' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#89C2D9' },
  cardCritical: { borderLeftColor: '#dc2626', backgroundColor: '#fef2f2' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  siteName: { fontSize: 16, fontWeight: '700', color: '#1e3c72' },
  siteId: { fontSize: 12, color: '#666', marginTop: 2 },
  
  daysBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  daysBadgeText: { fontSize: 11, fontWeight: '700' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoCol: { flex: 1, paddingRight: 10 },
  infoLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 13, color: '#333', fontWeight: '500' },

  alarmsWrapper: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  alarmsTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 },
  alarmItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  alarmText: { fontSize: 12, color: '#333', flex: 1 },
  alarmDate: { fontSize: 11, color: '#888' },
  alarmStatus: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusCleared: { backgroundColor: '#e2e8f0', color: '#475569' },
  statusActive: { backgroundColor: '#fee2e2', color: '#dc2626' }
});