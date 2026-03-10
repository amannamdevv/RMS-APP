import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { api } from '../../api';
import Icon from 'react-native-vector-icons/Feather';
import FilterModal from '../../components/FilterModal';

type Props = NativeStackScreenProps<RootStackParamList, 'SiteHealth'>;

export default function SiteHealthScreen({ navigation }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({ total: 0, up: 0, down: 0, non_comm: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeFilters, setActiveFilters] = useState({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  useEffect(() => {
    fetchData(1, true);
  }, [statusFilter, activeFilters]);

  const fetchData = async (pageNum = 1, isRefresh = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.getSiteHealth({ status: statusFilter, ...activeFilters }, pageNum, 20);
      if (res.status === 'success') {
        if (isRefresh) setData(res.sites);
        else setData(prev => [...prev, ...res.sites]);
        
        setCounts(res.counts);
        setHasNext(res.has_next);
        setPage(pageNum);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'UP') return '#10b981';
    if (status === 'DOWN') return '#01497C'; 
    return '#f59e0b'; 
  };

  const renderCard = ({ item }: { item: any }) => {
    const color = getStatusColor(item.status);
    return (
      <View style={[styles.card, { borderLeftColor: color }]}>
        <View style={styles.cardHeader}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('SiteDetails', { imei: item.imei, siteId: item.site_id })}>
            <Text style={styles.siteName}>{item.site_name}</Text>
            <Text style={styles.subText}>{item.site_id} | {item.global_id}</Text>
          </TouchableOpacity>
          <View style={[styles.badge, { backgroundColor: color + '15', borderColor: color }]}>
            <Text style={[styles.badgeText, { color: color }]}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>Batt LVD Trip</Text><Text style={styles.infoValue}>{item.battery_lvd_trip}</Text></View>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>Load LVD Trip</Text><Text style={styles.infoValue}>{item.load_lvd_trip}</Text></View>
        </View>
        <View style={[styles.infoRow, {marginBottom: item.alarms.length > 0 ? 10 : 0}]}>
            <View style={styles.infoCol}><Text style={styles.infoLabel}>Last Alarm</Text><Text style={styles.infoValue}>{item.last_alarm_time ? item.last_alarm_time.substring(0, 10) : 'None'}</Text></View>
            <View style={styles.infoCol}><Text style={styles.infoLabel}>Total Alarms</Text><Text style={styles.infoValue}>{item.alarms.length}</Text></View>
        </View>

        {item.alarms && item.alarms.length > 0 && (
          <View style={styles.alarmsWrapper}>
            <Text style={styles.alarmsTitle}>Active LVD Alarms</Text>
            {item.alarms.map((alarm: any, idx: number) => (
              <View key={idx} style={styles.alarmItem}>
                <Text style={styles.alarmText}>{alarm.alarm_name}</Text>
                <Text style={[styles.alarmStatus, alarm.end_time ? styles.statusCleared : styles.statusActive]}>
                  {alarm.end_time ? 'Cleared' : 'Open'}
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10 }}><Icon name="arrow-left" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Site Health Details</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setFilterModalVisible(true)}>
          <Icon name="filter" size={22} color="#fff" />
          {Object.keys(activeFilters).length > 0 && <View style={styles.activeFilterDot} />}
        </TouchableOpacity>
      </View>

      <FilterModal visible={filterModalVisible} onClose={() => setFilterModalVisible(false)} onApply={setActiveFilters} initialFilters={activeFilters} />

      <View style={styles.kpiGrid}>
        <TouchableOpacity style={[styles.kpiBox, statusFilter === 'all' && styles.activeBox, { borderTopColor: '#3498db' }]} onPress={() => setStatusFilter('all')}>
            <Text style={styles.kpiVal}>{counts.total}</Text><Text style={styles.kpiTitle}>Total</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.kpiBox, statusFilter === 'up' && styles.activeBox, { borderTopColor: '#10b981' }]} onPress={() => setStatusFilter('up')}>
            <Text style={styles.kpiVal}>{counts.up}</Text><Text style={styles.kpiTitle}>Up</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.kpiBox, statusFilter === 'down' && styles.activeBox, { borderTopColor: '#01497C' }]} onPress={() => setStatusFilter('down')}>
            <Text style={styles.kpiVal}>{counts.down}</Text><Text style={styles.kpiTitle}>Down</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.kpiBox, statusFilter === 'non_comm' && styles.activeBox, { borderTopColor: '#f59e0b' }]} onPress={() => setStatusFilter('non_comm')}>
            <Text style={styles.kpiVal}>{counts.non_comm}</Text><Text style={styles.kpiTitle}>Offline</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item, index) => item.imei + index}
        renderItem={renderCard}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(1, true)} />}
        onEndReached={() => hasNext && fetchData(page + 1, false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="small" color="#1e3c72" style={{ margin: 20 }} /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: '#1e3c72', padding: 16, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },
  iconBtn: { padding: 8, position: 'relative' },
  activeFilterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#1e3c72' },

  kpiGrid: { flexDirection: 'row', padding: 12, gap: 8, justifyContent: 'space-between' },
  kpiBox: { backgroundColor: '#fff', flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', elevation: 2, borderTopWidth: 4 },
  activeBox: { backgroundColor: '#e0e7ff', borderWidth: 1, borderColor: '#818cf8' },
  kpiVal: { fontSize: 18, fontWeight: '800', color: '#333' },
  kpiTitle: { fontSize: 11, color: '#666', fontWeight: '600', marginTop: 2 },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, borderLeftWidth: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  siteName: { fontSize: 16, fontWeight: '700', color: '#1e3c72' },
  subText: { fontSize: 12, color: '#666', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  infoCol: { flex: 1, paddingRight: 10 },
  infoLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 13, color: '#333', fontWeight: '600' },

  alarmsWrapper: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  alarmsTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 },
  alarmItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, backgroundColor: '#f8fafc', padding: 8, borderRadius: 6 },
  alarmText: { fontSize: 12, color: '#333', fontWeight: '500' },
  alarmStatus: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusCleared: { backgroundColor: '#e2e8f0', color: '#475569' },
  statusActive: { backgroundColor: '#fee2e2', color: '#dc2626' }
});