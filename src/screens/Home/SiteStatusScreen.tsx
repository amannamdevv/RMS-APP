import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { api } from '../../api';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import FilterModal from '../../components/FilterModal';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import AppHeader from '../../components/AppHeader';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Helper to convert JSON array to CSV string
const convertToCSV = (objArray: any[]) => {
  if (!objArray || objArray.length === 0) return '';

  // Extract all unique headers from all objects
  const allHeadersSet = new Set<string>();
  objArray.forEach(obj => Object.keys(obj).forEach(key => allHeadersSet.add(key)));
  const headers = Array.from(allHeadersSet);

  const csvRows = [headers.join(',')];

  // Loop through rows
  for (const row of objArray) {
    const values = headers.map(header => {
      // Ensure null/undefined becomes empty string, convert to string
      const val = row[header] !== null && row[header] !== undefined ? String(row[header]) : '';
      // Escape internal quotes and wrap in quotes to handle commas inside text
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
};

type Props = NativeStackScreenProps<RootStackParamList, 'SiteStatus'>;
type Site = {
  site_id: string;
  site_name: string;
  global_id: string;
  imei: string;
  battery_v: string;
  last_communication: string;
  site_status: string;
  commData?: any; // Added to store pre-loaded comm data
};

// --- SiteCard Component ---
const SiteCard = ({ item, onSiteDetailsClick }: { item: Site; onSiteDetailsClick: () => void }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleDetails = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const commData = item.commData;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.siteId}>{item.site_id}</Text>
        <View style={[styles.badge, item.site_status === 'Active' ? styles.activeBadge : styles.downBadge]}>
          <Text style={styles.badgeText}>{item.site_status}</Text>
        </View>
      </View>
      <Text style={styles.siteName}>{item.site_name}</Text>

      <View style={styles.infoRow}>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>IMEI</Text><Text style={styles.infoValue}>{item.imei}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Global ID</Text><Text style={styles.infoValue}>{item.global_id || '-'}</Text></View>
      </View>
      <View style={styles.infoRow}>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Battery</Text><Text style={styles.infoValue}>{item.battery_v ? `${item.battery_v} V` : '-'}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Last Comm</Text><Text style={styles.infoValue}>{item.last_communication || '-'}</Text></View>
      </View>

      {expanded && (
        <View style={styles.expandedContainer}>
          {commData ? (
            <>
              <View style={styles.commGrid}>
                <View style={styles.commBox}><Text style={styles.commBoxTitle}>S  SMPS</Text><Text style={styles.commLabel}>MAKE: <Text style={styles.commValue}>{commData.SMPS_Make || '-'}</Text></Text><Text style={styles.commLabel}>LAST COM: <Text style={styles.commValue}>{commData.SMPS_LAST_COM || '-'}</Text></Text></View>
                <View style={styles.commBox}><Text style={styles.commBoxTitle}>A  AMF</Text><Text style={styles.commLabel}>MAKE: <Text style={styles.commValue}>{commData.AMF_Make || '-'}</Text></Text><Text style={styles.commLabel}>LAST COM: <Text style={styles.commValue}>{commData.AMF_LAST_COM || '-'}</Text></Text></View>
                <View style={styles.commBox}><Text style={styles.commBoxTitle}>D  DCEM</Text><Text style={styles.commLabel}>MAKE: <Text style={styles.commValue}>{commData.DCEM_Make || '-'}</Text></Text><Text style={styles.commLabel}>LAST COM: <Text style={styles.commValue}>{commData.DCEM_Last_Com || '-'}</Text></Text></View>
              </View>
              <View style={styles.remarksBox}><Text style={styles.remarksTitle}>Remarks:</Text><Text style={styles.remarksText}>{commData.Remarks || '-'}</Text></View>
            </>
          ) : (
            <Text style={styles.noDataText}>No communication data available.</Text>
          )}
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtnOutline} onPress={toggleDetails}>
          <Text style={styles.actionBtnOutlineText}>{expanded ? 'Hide Details ▲' : 'View Details ▼'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnSolid} onPress={onSiteDetailsClick}>
          <Text style={styles.actionBtnSolidText}>Site Details →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Main Screen ---
export default function SiteStatusScreen({ navigation }: Props) {
  const [sites, setSites] = useState<Site[]>([]);
  const [kpi, setKpi] = useState({ total_sites: 0, active_sites: 0, non_active_sites: 0 });
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const loadSites = async (pageNumber = 1, replace = false, currentFilters = activeFilters) => {
    if (loading && !replace) return;
    setLoading(true);

    try {
      const res = await api.getSiteStatus({ status: statusFilter, ...currentFilters }, pageNumber, 10);

      if (res && res.sites) {
        // Use unfiltered_kpi if available to keep top-level counts accurate
        if (res.unfiltered_kpi) {
          setKpi(res.unfiltered_kpi);
        } else if (res.kpi) {
          setKpi(res.kpi);
        }

        // --- MERGE COMMUNICATION DATA INTO SITES ---
        // Create a lookup map for faster access
        const comms = res.communication || [];
        const commMap: any = {};
        comms.forEach((c: any) => { if (c.imei) commMap[c.imei] = c; });

        // Map commData to each site by IMEI
        const sitesWithComm = res.sites.map((site: any) => ({
          ...site,
          commData: commMap[site.imei] || null
        }));

        setHasNext(res.pagination?.has_next ?? false);
        setPage(pageNumber);

        if (replace) setSites(sitesWithComm);
        else setSites(prev => [...prev, ...sitesWithComm]);
      } else {
        console.log('Unexpected response structure:', res);
      }
    } catch (error) {
      console.log('Load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSites(1, true, activeFilters);
  }, [statusFilter, activeFilters]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSites(1, true);
  };

  const loadMore = () => {
    if (hasNext && !loading) loadSites(page + 1, false);
  };

  const handleApplyFilters = (newFilters: any) => {
    setActiveFilters(newFilters);
  };

  const handleExport = async () => {
    if (exporting) return;
    try {
      setExporting(true);

      // Fetch all filtered data in one shot (large page size)
      const res = await api.getSiteStatus(
        { status: statusFilter, ...activeFilters },
        1,
        10000
      );

      const sitesArray = res?.sites;

      if (!sitesArray || sitesArray.length === 0) {
        Alert.alert('No Data', 'There is no data to export with the current filters.');
        return;
      }

      // Build clean flat rows for CSV
      const csvRows = sitesArray.map((site: any) => ({
        'Site ID': site.site_id || '',
        'Site Name': site.site_name || '',
        'Global ID': site.global_id || '',
        'IMEI': site.imei || '',
        'Status': site.site_status || '',
        'Battery (V)': site.battery_v || '',
        'Last Communication': site.last_communication || '',
      }));

      const csvString = convertToCSV(csvRows);
      const fileName = `Site_Status_${new Date().getTime()}.csv`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, csvString, 'utf8');

      await Share.open({
        title: 'Export Site Status',
        url: `file://${filePath}`,
        type: 'text/csv',
        filename: fileName,
        showAppsToView: true,
      });
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        Alert.alert('Export Error', 'Failed to generate or download CSV.');
        console.error(error);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Site Status"
        leftAction="back"
        onLeftPress={() => navigation.goBack()}
        rightActions={[
          { icon: exporting ? 'loader' : 'download', onPress: handleExport },
          { icon: 'filter', onPress: () => setFilterModalVisible(true), badge: Object.keys(activeFilters).length > 0 },
        ]}
      />

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />

      {/* KPIs */}
      <View style={styles.kpiContainer}>
        <TouchableOpacity 
          style={[styles.kpiCard, { borderTopColor: '#3b82f6' }, statusFilter === '' && styles.kpiActive]} 
          onPress={() => setStatusFilter('')}
        >
          <Text style={styles.kpiValue}>{kpi.total_sites}</Text>
          <Text style={styles.kpiLabel}>Total</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.kpiCard, { borderTopColor: '#10b981' }, statusFilter === 'active' && styles.kpiActive]} 
          onPress={() => setStatusFilter('active')}
        >
          <Text style={[styles.kpiValue, { color: '#10b981' }]}>{kpi.active_sites}</Text>
          <Text style={styles.kpiLabel}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.kpiCard, { borderTopColor: '#ef4444' }, statusFilter === 'down' && styles.kpiActive]} 
          onPress={() => setStatusFilter('down')}
        >
          <Text style={[styles.kpiValue, { color: '#ef4444' }]}>{kpi.non_active_sites}</Text>
          <Text style={styles.kpiLabel}>Offline</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sites}
        keyExtractor={(item, index) => (item.imei || item.site_id || index).toString()}
        renderItem={({ item }) => (
          <SiteCard
            item={item}
            onSiteDetailsClick={() => navigation.navigate('SiteDetails', { imei: item.imei, siteId: item.site_id })}
          />
        )}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="small" color="#1e3c72" style={{ margin: 20 }} /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c5d4eeff' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, marginLeft: 10, position: 'relative' },
  activeFilterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#1e3c72' },

  kpiContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  kpiCard: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 10, alignItems: 'center', elevation: 3, borderTopWidth: 4 },
  kpiActive: { backgroundColor: '#f0f4ff', elevation: 1 },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#1e3c72' },
  kpiLabel: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '700', textTransform: 'uppercase' },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  siteId: { fontSize: 16, fontWeight: '700', color: '#1e3c72' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: '#d1fae5' },
  downBadge: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#333' },
  siteName: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#111' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 13, color: '#333', fontWeight: '500' },

  // Expanded Section Styles
  expandedContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  commGrid: { flexDirection: 'column', gap: 8, marginBottom: 10 },
  commBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  commBoxTitle: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
  commLabel: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  commValue: { fontSize: 12, color: '#0f172a', fontWeight: '600' },
  remarksBox: { backgroundColor: '#f0f9ff', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#38bdf8' },
  remarksTitle: { fontSize: 12, fontWeight: '700', color: '#0369a1', marginBottom: 4 },
  remarksText: { fontSize: 12, color: '#0c4a6e' },
  noDataText: { textAlign: 'center', color: '#888', fontSize: 13, marginVertical: 10 },

  // Action Buttons Row
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 10 },
  actionBtnOutline: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#64748b', alignItems: 'center' },
  actionBtnOutlineText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  actionBtnSolid: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1e3c72', alignItems: 'center' },
  actionBtnSolidText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});