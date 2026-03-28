import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, RefreshControl, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { api } from '../../api';
import Icon from 'react-native-vector-icons/Feather';
import FilterModal from '../../components/FilterModal';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import AppHeader from '../../components/AppHeader';
import { moderateScale, responsiveFontSize, verticalScale, scale } from '../../utils/responsive';

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
    const isOffline = item.status === 'NON_COMM' || item.status === 'Offline';
    
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
            <Text style={styles.infoValue}>{item.battery_lvd_trip || 'N/A'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Load LVD Trip</Text>
            <Text style={styles.infoValue}>{item.load_lvd_trip || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Last Comm</Text>
            <Text style={styles.infoValue}>{item.last_comm || item.last_communication || item.create_dt || 'N/A'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Battery V</Text>
            <Text style={styles.infoValue}>{item.battery_v || item.battery_voltage || '0.00'}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Signal</Text>
            <Text style={styles.infoValue}>{item.signal || item.signal_strength || '-'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>IMEI</Text>
            <Text style={styles.infoValue}>{item.imei || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.dividerSmall} />
        <View style={styles.cardFooter}>
          <Text style={styles.footerLabel}>Last Alarm: <Text style={styles.footerValue}>{item.last_alarm_desc || 'No recent alarms'}</Text></Text>
          <Text style={styles.footerLabel}>LVD Cut: <Text style={styles.footerValue}>No LVD Cut alarms</Text></Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: 650 }}>
      <AppHeader
        title="Site Health Details"
        leftAction="back"
        onLeftPress={() => navigation.goBack()}
        rightActions={[
          { icon: exporting ? 'loader' : 'download', onPress: handleExport },
          { icon: 'filter', onPress: () => setFilterModalVisible(true), badge: Object.keys(activeFilters).length > 0 },
        ]}
      />

      <FilterModal visible={filterModalVisible} onClose={() => setFilterModalVisible(false)} onApply={setActiveFilters} initialFilters={activeFilters} />

      {/* Range Filters / Tabs */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {[
            { label: 'All', value: 'all', count: counts.total || 0, color: '#3b82f6', icon: 'list' },
            { label: 'UP', value: 'up', count: counts.up || 0, color: '#10b981', icon: 'check-circle' },
            { label: 'DOWN', value: 'down', count: counts.down || 0, color: '#dc2626', icon: 'x-circle' },
            { label: 'Offline', value: 'non_comm', count: counts.non_comm || 0, color: '#f59e0b', icon: 'wifi-off' },
          ].map(t => {
            const isActive = statusFilter === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setStatusFilter(t.value)}
                activeOpacity={0.7}
              >
                <Icon name={t.icon} size={13} color={isActive ? '#fff' : t.color} style={{ marginRight: 6 }} />
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {t.label} <Text style={{ fontSize: 10, fontWeight: '700' }}>({t.count})</Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c5d4eeff' },
  iconBtn: { padding: 8, position: 'relative' },
  activeFilterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#1e3c72' },

  filterBar: { 
    backgroundColor: '#fff', 
    paddingVertical: verticalScale(12), 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e8f0' 
  },
  filterPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: moderateScale(16), 
    paddingVertical: verticalScale(8), 
    borderRadius: moderateScale(20), 
    backgroundColor: '#f1f5f9', 
    marginHorizontal: moderateScale(5), 
    borderWidth: 1, 
    borderColor: '#e2e8f0' 
  },
  filterPillActive: { backgroundColor: '#1e3c72', borderColor: '#1e3c72' },
  filterText: { fontSize: responsiveFontSize(12), fontWeight: '700', color: '#64748b' },
  filterTextActive: { color: '#fff' },

  card: { 
    backgroundColor: '#fff', 
    padding: moderateScale(16), 
    borderRadius: moderateScale(12), 
    marginBottom: verticalScale(12), 
    elevation: 2, 
    borderLeftWidth: 5 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: verticalScale(12) 
  },
  siteName: { fontSize: responsiveFontSize(15), fontWeight: '700', color: '#1e3c72' },
  subText: { fontSize: responsiveFontSize(11), color: '#666', marginTop: verticalScale(2) },
  badge: { 
    paddingHorizontal: moderateScale(10), 
    paddingVertical: verticalScale(4), 
    borderRadius: moderateScale(12), 
    borderWidth: 1 
  },
  badgeText: { fontSize: responsiveFontSize(10), fontWeight: '800' },
  infoRow: { flexDirection: 'row', marginBottom: verticalScale(8) },
  infoCol: { flex: 1 },
  infoLabel: { 
    fontSize: responsiveFontSize(10), 
    color: '#888', 
    textTransform: 'uppercase', 
    marginBottom: verticalScale(2) 
  },
  infoValue: { fontSize: responsiveFontSize(13), color: '#333', fontWeight: '600' },
  dividerSmall: { height: 1, backgroundColor: '#f0f4f8', marginVertical: verticalScale(10) },
  cardFooter: { gap: verticalScale(4) },
  footerLabel: { fontSize: responsiveFontSize(11), color: '#888', fontWeight: '600' },
  footerValue: { color: '#4b5563', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: verticalScale(30), color: '#888' }
});