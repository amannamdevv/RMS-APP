import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { api } from '../../api';
import Icon from 'react-native-vector-icons/Feather';
import FilterModal from '../../components/FilterModal';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

type Props = NativeStackScreenProps<RootStackParamList, 'SiteRunningStatus'>;

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

export default function SiteRunningStatusScreen({ navigation }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({
    total_active: 0,
    total_non_active: 0,
    total_soeb: 0,
    total_sobt: 0,
    total_sodg: 0
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  const [activeFilters, setActiveFilters] = useState({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all filtered data from server for a complete export
      const res = await api.getSiteRunningStatus(activeFilters, 1, 10000);
      
      const sitesToExport = res?.sites || [];

      if (sitesToExport.length === 0) {
        Alert.alert("No Data", "There is no data to export with the current filters.");
        return;
      }
      
      const csvString = convertToCSV(sitesToExport);
      const fileName = `Running_Status_${activeTab}_${new Date().getTime()}.csv`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, csvString, 'utf8');
      await Share.open({
        title: 'Export Running Status',
        url: `file://${filePath}`,
        type: 'text/csv',
        filename: fileName,
        showAppsToView: true,
      });
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        Alert.alert("Export Error", "Failed to generate or open export data.");
        console.error(error);
      }
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchData(activeFilters);
  }, [activeFilters]);

  const fetchData = async (currentFilters = {}) => {
    setLoading(true);
    try {
      const res = await api.getSiteRunningStatus(currentFilters);
      // Logic Fix: Django returns the object directly, not wrapped in 'success'
      if (res && res.sites) {
        setData(res.sites);
        setCounts(res.counts);
        // Apply the tab filter immediately on fresh data
        applyLocalTabFilter(res.sites, activeTab);
      }
    } catch (e) {
      console.error("API Error:", e);
      Alert.alert("Connection Error", "Could not fetch running status data.");
    } finally {
      setLoading(false);
    }
  };

  const applyLocalTabFilter = (allData: any[], tab: string) => {
    if (tab === 'All') {
      setFilteredData(allData);
    } else if (tab === 'Non-Comm') {
      setFilteredData(allData.filter(s => s.comm_status === 'Non Active'));
    } else {
      // Logic Fix: Backend uses 'SOEB', 'SOBT', etc. as running_status
      setFilteredData(allData.filter(s => s.running_status === tab && s.comm_status === 'Active'));
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    applyLocalTabFilter(data, tab);
  };

  const getStatusColor = (status: string, comm: string) => {
    if (comm === 'Non Active') return '#dc2626';
    if (status === 'SOEB') return '#01497C';
    if (status === 'SOBT') return '#468FAF';
    if (status === 'SODG') return '#ea580c';
    return '#888';
  };

  const renderCard = ({ item }: { item: any }) => {
    const isOffline = item.comm_status === 'Non Active';
    const displayStatus = isOffline ? 'Non-Comm' : (item.running_status || 'Unknown');
    const color = getStatusColor(item.running_status, item.comm_status);

    // Data Fix: Map the 3-phase voltages from backend
    const mainsVal = `${item.mainsVoltR || 0}/${item.mainsVoltY || 0}/${item.mainsVoltB || 0}V`;
    const dgVal = `${item.dgVoltR || 0}/${item.dgVoltY || 0}/${item.dgVoltB || 0}V`;

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: color }]}
        onPress={() => navigation.navigate('SiteDetails', { imei: item.imei, siteId: '' })}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.siteName}>{item.site_name}</Text>
            <Text style={styles.imei}>{item.imei}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{displayStatus}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.val}>{item.current_session_duration}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Battery</Text>
            <Text style={styles.val}>{item.btsBattVolt ? `${item.btsBattVolt}V` : 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Mains (R/Y/B)</Text>
            <Text style={styles.val}>{mainsVal}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>DG (R/Y/B)</Text>
            <Text style={styles.val}>{dgVal}</Text>
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          <Text style={styles.label}>Last Communication</Text>
          <Text style={styles.val}>
            {item.start_time ? item.start_time.replace('T', ' ').substring(0, 16) : 'N/A'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Running Status</Text>

        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleExport} disabled={exporting}>
            {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="download" size={22} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setFilterModalVisible(true)}>
            <Icon name="filter" size={22} color="#fff" />
            {Object.keys(activeFilters).length > 0 && <View style={styles.activeFilterDot} />}
          </TouchableOpacity>
        </View>
      </View>

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(f: Record<string, string>) => setActiveFilters(f)}
        initialFilters={activeFilters}
      />

      {!loading && (
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiBox, { borderTopColor: '#3498db' }]}><Text style={styles.kpiVal}>{data.length}</Text><Text style={styles.kpiTitle}>Total</Text></View>
          <View style={[styles.kpiBox, { borderTopColor: '#01497C' }]}><Text style={styles.kpiVal}>{counts.total_soeb || 0}</Text><Text style={styles.kpiTitle}>SOEB</Text></View>
          <View style={[styles.kpiBox, { borderTopColor: '#468FAF' }]}><Text style={styles.kpiVal}>{counts.total_sobt || 0}</Text><Text style={styles.kpiTitle}>SOBT</Text></View>
          <View style={[styles.kpiBox, { borderTopColor: '#ea580c' }]}><Text style={styles.kpiVal}>{counts.total_sodg || 0}</Text><Text style={styles.kpiTitle}>SODG</Text></View>
          <View style={[styles.kpiBox, { borderTopColor: '#dc2626' }]}><Text style={styles.kpiVal}>{counts.total_non_active || 0}</Text><Text style={styles.kpiTitle}>Offline</Text></View>
        </View>
      )}

      <View style={styles.tabsContainer}>
        {['All', 'SOEB', 'SOBT', 'SODG', 'Non-Comm'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => handleTabChange(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1e3c72" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => (item.imei || item.site_id || index).toString()}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>No sites found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c5d4eeff' },
  header: { backgroundColor: '#1e3c72', padding: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { paddingRight: 10 },
  backArrow: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },

  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, marginLeft: 5, position: 'relative' },
  activeFilterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#1e3c72' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 10, justifyContent: 'center' },
  kpiBox: { backgroundColor: '#fff', padding: 12, borderRadius: 8, minWidth: '30%', alignItems: 'center', elevation: 2, borderTopWidth: 4 },
  kpiVal: { fontSize: 20, fontWeight: '800', color: '#333' },
  kpiTitle: { fontSize: 11, color: '#666', fontWeight: '600', marginTop: 2 },

  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, flexWrap: 'wrap', gap: 8 },
  tab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#e2e8f0' },
  tabActive: { backgroundColor: '#1e3c72' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  tabTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, borderLeftWidth: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  siteName: { fontSize: 16, fontWeight: '700', color: '#1e3c72' },
  imei: { fontSize: 12, color: '#666', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  row: { flexDirection: 'row', marginTop: 8 },
  col: { flex: 1 },
  label: { fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  val: { fontSize: 13, color: '#333', fontWeight: '600' }
});