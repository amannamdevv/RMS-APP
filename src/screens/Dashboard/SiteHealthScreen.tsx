import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { api } from '../../api';
import Icon from 'react-native-vector-icons/Feather';
import FilterModal from '../../components/FilterModal';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

type Props = NativeStackScreenProps<RootStackParamList, 'SiteHealth'>;

// Helper to convert JSON array to CSV string
const convertToCSV = (objArray: any[]) => {
  if (!objArray || objArray.length === 0) return '';
  const allHeadersSet = new Set<string>();
  objArray.forEach(obj => Object.keys(obj).forEach(key => allHeadersSet.add(key)));
  const headers = Array.from(allHeadersSet);
  const csvRows = [headers.join(',')];
  for (const row of objArray) {
    const values = headers.map(header => {
      const val = row[header] !== null && row[header] !== undefined ? String(row[header]) : '';
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
};

export default function SiteHealthScreen({ route, navigation }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({ total: 0, up: 0, down: 0, non_comm: 0 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);

  const [statusFilter, setStatusFilter] = useState(route.params?.status || 'all');
  const [activeFilters, setActiveFilters] = useState({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Sync status if changes from navigation
  useEffect(() => {
    if (route.params?.status) {
      setStatusFilter(route.params.status);
    }
  }, [route.params?.status]);

  // Jab bhi filters ya tab badlein, list aur counts dono fetch karein
  useEffect(() => {
    onRefresh();
  }, [statusFilter, activeFilters]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(1, true);
    setRefreshing(false);
  };

  const fetchData = async (pageNum = 1, isRefresh = false) => {
    if (loading && !isRefresh) return;
    setLoading(true);
    try {
      const res = await api.getSiteHealth({ status: statusFilter, ...activeFilters }, pageNum, 20);
      
      if (res && res.sites) {
        if (isRefresh) setData(res.sites);
        else setData(prev => [...prev, ...res.sites]);

        if (res.kpi_data) {
          setCounts({
            total: res.kpi_data.total_sites ?? 0,
            up: res.kpi_data.up_sites ?? 0,
            down: res.kpi_data.down_sites ?? 0,
            non_comm: res.kpi_data.non_comm_sites ?? 0
          });
        }
        setHasNext(res.sites.length === 20);
        setPage(pageNum);
      }
    } catch (e) {
      console.error("Data load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch larger set for export (Download All)
      const res = await api.getSiteHealth({ status: statusFilter, ...activeFilters }, 1, 10000);
      if (res && res.sites) {
        if (res.sites.length === 0) {
          Alert.alert("No Data", "There is no data to export with the current filters.");
          return;
        }

        const csvString = convertToCSV(res.sites);
        const fileName = `Site_Health_${new Date().getTime()}.csv`;
        const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

        await RNFS.writeFile(filePath, csvString, 'utf8');
        await Share.open({
          title: 'Export Site Health',
          url: `file://${filePath}`,
          type: 'text/csv',
          filename: fileName,
          showAppsToView: true,
        });
      }
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        Alert.alert("Export Error", "Failed to generate or open export data.");
        console.error(error);
      }
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'UP') return '#10b981';
    if (status === 'DOWN') return '#dc2626';
    return '#f59e0b';
  };

  const renderCard = ({ item }: { item: any }) => {
    const color = getStatusColor(item.status);
    return (
      <View style={[styles.card, { borderLeftColor: color }]}>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => {
              const imeiToPass = item.imei || (item.alarms?.[0]?.imei) || undefined;
              navigation.navigate('SiteDetails', { 
                imei: imeiToPass, 
                siteId: item.site_id 
              });
            }}
          >
            <Text style={styles.siteName}>{item.site_name}</Text>
            <Text style={styles.subText}>{item.site_id} | {item.global_id || item.site_global_id || 'N/A'}</Text>
          </TouchableOpacity>
          <View style={[styles.badge, { backgroundColor: color + '15', borderColor: color }]}>
            <Text style={[styles.badgeText, { color: color }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Batt LVD Trip</Text>
            <Text style={styles.infoValue}>{item.battery_lvd_trip || '0'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Load LVD Trip</Text>
            <Text style={styles.infoValue}>{item.load_lvd_trip || '0'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10 }}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Site Health Details</Text>
        
        <TouchableOpacity style={styles.iconBtn} onPress={handleExport} disabled={exporting}>
          {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="download" size={22} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={() => setFilterModalVisible(true)}>
          <Icon name="filter" size={22} color="#fff" />
          {Object.keys(activeFilters).length > 0 && <View style={styles.activeFilterDot} />}
        </TouchableOpacity>
      </View>

      <FilterModal visible={filterModalVisible} onClose={() => setFilterModalVisible(false)} onApply={setActiveFilters} initialFilters={activeFilters} />

      {/* KPI Section using your specific counts API */}
      <View style={styles.kpiGrid}>
        <TouchableOpacity style={[styles.kpiBox, statusFilter === 'all' && styles.activeBox, { borderTopColor: '#3498db' }]} onPress={() => setStatusFilter('all')}>
          <Text style={styles.kpiVal}>{counts.total || 0}</Text><Text style={styles.kpiTitle}>Total</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.kpiBox, statusFilter === 'up' && styles.activeBox, { borderTopColor: '#10b981' }]} onPress={() => setStatusFilter('up')}>
          <Text style={styles.kpiVal}>{counts.up || 0}</Text><Text style={styles.kpiTitle}>Up</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.kpiBox, statusFilter === 'down' && styles.activeBox, { borderTopColor: '#dc2626' }]} onPress={() => setStatusFilter('down')}>
          <Text style={styles.kpiVal}>{counts.down || 0}</Text><Text style={styles.kpiTitle}>Down</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.kpiBox, statusFilter === 'non_comm' && styles.activeBox, { borderTopColor: '#f59e0b' }]} onPress={() => setStatusFilter('non_comm')}>
          <Text style={styles.kpiVal}>{counts.non_comm || 0}</Text><Text style={styles.kpiTitle}>Offline</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item, index) => (item.imei || item.site_id || index).toString()}
        renderItem={renderCard}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => hasNext && fetchData(page + 1, false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="small" color="#1e3c72" style={{ margin: 20 }} /> : null}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No sites found.</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c5d4eeff' },
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
  siteName: { fontSize: 15, fontWeight: '700', color: '#1e3c72' },
  subText: { fontSize: 11, color: '#666', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#888' }
});