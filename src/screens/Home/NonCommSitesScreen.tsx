import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, SafeAreaView, RefreshControl, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { api } from '../../api';
import Icon from 'react-native-vector-icons/Feather';
import FilterModal from '../../components/FilterModal';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

type Props = NativeStackScreenProps<RootStackParamList, 'NonCommSites'>;

// ─── Aging Bucket Card ────────────────────────────────────────────────────────
const AgingBucket = ({ label, count, color }: { label: string; count: number; color: string }) => (
  <View style={[styles.bucketCard, { borderTopColor: color }]}>
    <Text style={[styles.bucketCount, { color }]}>{count}</Text>
    <Text style={styles.bucketLabel}>{label}</Text>
  </View>
);

// ─── Days-offline badge color ─────────────────────────────────────────────────
const getDaysColor = (days: number | null): string => {
  if (days === null || days === undefined) return '#7f1d1d';
  if (days > 90) return '#7f1d1d';
  if (days > 60) return '#991b1b';
  if (days > 30) return '#dc2626';
  if (days > 7) return '#ea580c';
  return '#ca8a04';
};

// ─── Site Card ────────────────────────────────────────────────────────────────
const SiteCard = ({ item, onPress }: { item: any; onPress: () => void }) => {
  const days = item.days_since_comm ?? null;
  const color = getDaysColor(days);
  const isCritical = days === null || days > 7;

  const lastComm = item.last_communication
    ? String(item.last_communication).replace('T', ' ').substring(0, 16)
    : 'Never communicated';

  const daysLabel = days !== null ? `${days} day${days !== 1 ? 's' : ''} offline` : 'Never comm';

  return (
    <TouchableOpacity
      style={[styles.card, isCritical && styles.cardCritical]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.siteName} numberOfLines={2}>{item.site_name || '—'}</Text>
          <Text style={styles.siteId}>{item.site_id}</Text>
        </View>
        <View style={[styles.daysBadge, { backgroundColor: color + '18', borderColor: color }]}>
          <Icon name="wifi-off" size={11} color={color} style={{ marginRight: 4 }} />
          <Text style={[styles.daysBadgeText, { color }]}>{daysLabel}</Text>
        </View>
      </View>

      {/* ── Divider ─────────────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Info Grid ───────────────────────────────────────── */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>📡 IMEI</Text>
          <Text style={styles.infoValue}>{item.imei || '—'}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>🌐 Global ID</Text>
          <Text style={styles.infoValue}>{item.globel_id || item.global_id || '—'}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>🕐 Last Communication</Text>
          <Text style={[styles.infoValue, { color: isCritical ? '#dc2626' : '#333' }]}>
            {lastComm}
          </Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>📍 Location</Text>
          <Text style={styles.infoValue}>
            {[item.state_name, item.district_name, item.cluster_name]
              .filter(Boolean)
              .join(' / ') || '—'}
          </Text>
        </View>
      </View>

      {/* ── Duration Bar ────────────────────────────────────── */}
      {days !== null && (
        <View style={styles.durationRow}>
          <View style={styles.durationBarBg}>
            <View
              style={[
                styles.durationBarFill,
                {
                  backgroundColor: color,
                  width: `${Math.min((days / 90) * 100, 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.durationLabel, { color }]}>
            {days <= 7 ? '0–7 days' :
              days <= 30 ? '8–30 days' :
                days <= 60 ? '31–60 days' :
                  days <= 90 ? '61–90 days' : '90+ days'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NonCommSitesScreen({ navigation }: Props) {
  const [sites, setSites] = useState<any[]>([]);
  const [buckets, setBuckets] = useState<any>(null);
  const [totalSites, setTotalSites] = useState(0);

  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const fetchData = async (
    pageNum = 1,
    isRefresh = false,
    currentFilters = activeFilters,
  ) => {
    if (loading && !isRefresh) return;
    setLoading(true);

    try {
      if (pageNum === 1) {
        const bucketRes = await api.getNonCommAging(currentFilters);
        // Fallback for different response types
        const bucketData = bucketRes.status === 'success' ? bucketRes.data : bucketRes;
        if (bucketData?.aging_buckets) {
          setBuckets(bucketData.aging_buckets);
          setTotalSites(bucketData.total_non_comm ?? bucketData.total_sites ?? 0);
        }
      }

      const listRes = await api.getNonCommSitesList(currentFilters, pageNum, 10);
      // Django returns { sites: [...] } directly
      if (listRes && listRes.sites) {
        if (isRefresh) setSites(listRes.sites);
        else setSites(prev => [...prev, ...listRes.sites]);
        
        // If API doesn't provide has_next, we assume we have everything if sites.length < 10
        setHasNext(listRes.has_next ?? listRes.sites.length === 10);
        setPage(pageNum);
        if (pageNum === 1) setTotalSites(listRes.total_sites ?? listRes.sites.length);
      }
    } catch (e) {
      console.error('[NonComm] Fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(1, true, activeFilters);
  }, [activeFilters]);

  const handleExport = async () => {
    setLoading(true);
    try {
      // 1. Fetch the Excel blob from backend
      const response = await api.exportNonCommSites(activeFilters);
      
      // 2. Convert blob to Base64 (using a helper or FileReader)
      // Since RN doesn't have a direct blob-to-file path, we'll read it
      const reader = new FileReader();
      reader.onload = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const fileName = `NonComm_Sites_Report_${Date.now()}.xlsx`;
        const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

        // 3. Save to local storage
        await RNFS.writeFile(filePath, base64data, 'base64');

        // 4. Open share sheet
        await Share.open({
          title: 'Export Non-Comm Sites',
          url: `file://${filePath}`,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: fileName,
        });
        setLoading(false);
      };
      
      reader.readAsDataURL(response.data);

    } catch (error: any) {
      setLoading(false);
      if (error?.message !== 'User did not share') {
        Alert.alert('Export Error', 'Failed to download Excel report from server.');
        console.error(error);
      }
    }
  };

  const BUCKET_CONFIG = [
    { key: '0-7 days', label: '0–7 Days', color: '#ca8a04' },
    { key: '8-30 days', label: '8–30 Days', color: '#ea580c' },
    { key: '31-60 days', label: '31–60 Days', color: '#dc2626' },
    { key: '61-90 days', label: '61–90 Days', color: '#991b1b' },
    { key: '90+ days', label: '90+ Days', color: '#7f1d1d' },
  ];

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offline Sites</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleExport}>
            <Icon name="download" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setFilterModalVisible(true)}>
            <Icon name="filter" size={22} color="#fff" />
            {Object.keys(activeFilters).length > 0 && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>
      </View>

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(f: Record<string, string>) => setActiveFilters(f)}
        initialFilters={activeFilters}
      />

      {/* ── Aging Buckets ────────────────────────────────────────────────────── */}
      {buckets && (
        <View style={styles.bucketsSection}>
          <View style={styles.totalRow}>
            <Icon name="wifi-off" size={16} color="#dc2626" />
            <Text style={styles.totalText}>
              Total Offline: <Text style={styles.totalCount}>{totalSites}</Text>
            </Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={BUCKET_CONFIG}
            keyExtractor={item => item.key}
            contentContainerStyle={styles.bucketsContainer}
            renderItem={({ item }) => (
              <AgingBucket
                label={item.label}
                count={buckets[item.key] ?? 0}
                color={item.color}
              />
            )}
          />
        </View>
      )}

      {/* ── Sites List ──────────────────────────────────────────────────────── */}
      <FlatList
        data={sites}
        keyExtractor={(item, index) => (item.imei || item.site_id || index).toString()}
        renderItem={({ item }) => (
          <SiteCard
            item={item}
            onPress={() => navigation.navigate('SiteDetails', { imei: item.imei, siteId: item.site_id })}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(1, true, activeFilters); }}
          />
        }
        onEndReached={() => { if (hasNext && !loading) fetchData(page + 1, false, activeFilters); }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Icon name="check-circle" size={40} color="#22c55e" />
              <Text style={styles.emptyTitle}>All Sites Online</Text>
              <Text style={styles.emptySubtitle}>No offline sites match current filters.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? <ActivityIndicator size="small" color="#1e3c72" style={{ margin: 20 }} /> : null
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c5d4eeff' },
  header: { backgroundColor: '#1e3c72', padding: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { paddingRight: 12 },
  backArrow: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, marginLeft: 4, position: 'relative' },
  filterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },

  bucketsSection: { backgroundColor: '#fff', paddingBottom: 12, elevation: 2 },
  totalRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 8 },
  totalText: { fontSize: 14, color: '#475569', fontWeight: '600' },
  totalCount: { color: '#dc2626', fontWeight: '800' },
  bucketsContainer: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  bucketCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, minWidth: 88, alignItems: 'center', elevation: 1, borderTopWidth: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  bucketCount: { fontSize: 22, fontWeight: '800' },
  bucketLabel: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '600', textAlign: 'center' },

  // Site card
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 3, borderLeftWidth: 5, borderLeftColor: '#89c2d9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardCritical: { borderLeftColor: '#dc2626', backgroundColor: '#fffbfb' },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  siteName: { fontSize: 15, fontWeight: '700', color: '#1e3c72', lineHeight: 20 },
  siteId: { fontSize: 11, color: '#94a3b8', marginTop: 3, fontWeight: '500' },
  daysBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  daysBadgeText: { fontSize: 10, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoCell: { width: '50%', marginBottom: 10, paddingRight: 8 },
  infoLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 13, color: '#334155', fontWeight: '600' },

  durationRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  durationBarBg: { flex: 1, height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  durationBarFill: { height: '100%', borderRadius: 3 },
  durationLabel: { fontSize: 10, fontWeight: '700', width: 65, textAlign: 'right' },

  emptyBox: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e3c72', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
});