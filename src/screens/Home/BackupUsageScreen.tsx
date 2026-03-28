import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { api } from '../../api';
import AppHeader from '../../components/AppHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'BackupUsage'>;
type Tab = 'all' | 'dg' | 'battery' | 'both';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dateToStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function fmtDisplay(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function convertToCSV(rows: any[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
  }
  return lines.join('\n');
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function BackupUsageScreen({ navigation }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const fetchData = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const res = await api.getSitesWentOnBackupCount(dateToStr(date));
      setData(res);
    } catch (e) {
      Alert.alert('Error', 'Failed to load backup usage data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(selectedDate); }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  const total = data?.total_sites || 0;
  const dgCount = data?.sites_went_on_dg || 0;
  const battCount = data?.sites_went_on_battery || 0;
  const bothCount = data?.sites_went_on_both || 0;
  const backupTotal = data?.total_sites_with_backup || 0;

  const pct = (n: number) => total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';

  const tabSites: Record<Tab, any[]> = {
    all: [
      ...(data?.sites_on_dg_list || []).map((s: any) => ({ ...s, type: 'dg' })),
      ...(data?.sites_on_battery_list || []).map((s: any) => ({ ...s, type: 'battery' })),
      ...(data?.sites_on_both_list || []).map((s: any) => ({ ...s, type: 'both' })),
    ],
    dg: (data?.sites_on_dg_list || []).map((s: any) => ({ ...s, type: 'dg' })),
    battery: (data?.sites_on_battery_list || []).map((s: any) => ({ ...s, type: 'battery' })),
    both: (data?.sites_on_both_list || []).map((s: any) => ({ ...s, type: 'both' })),
  };

  const sites = tabSites[activeTab];

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!data || !tabSites.all.length) { Alert.alert('No Data', 'Nothing to export'); return; }
    setExporting(true);
    try {
      const rows = tabSites.all.map((s, i) => ({
        'S.No': i + 1,
        'Site ID': s.site_id,
        'Site Name': s.site_name,
        'IMEI': s.imei,
        'Backup Type': s.type === 'dg' ? 'DG' : s.type === 'battery' ? 'Battery' : 'DG + Battery',
        'DG Duration': s.dg_duration || '00:00:00',
        'Battery Duration': s.battery_duration || '00:00:00',
        'Mains Duration': s.mains_duration || '00:00:00',
      }));
      const csv = convertToCSV(rows);
      const fileName = `BackupUsage_${dateToStr(selectedDate)}.csv`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      await RNFS.writeFile(filePath, csv, 'utf8');
      await Share.open({ title: 'Export Backup Usage', url: `file://${filePath}`, type: 'text/csv', filename: fileName, showAppsToView: true });
    } catch (e: any) {
      if (e?.message !== 'User did not share') Alert.alert('Export Error', 'Failed to generate CSV');
    } finally {
      setExporting(false);
    }
  };

  // ── Badge config ─────────────────────────────────────────────────────────
  const badgeCfg: Record<string, { label: string; bg: string; fg: string }> = {
    dg:      { label: 'DG',          bg: '#fdebd0', fg: '#b9770e' },
    battery: { label: 'Battery',     bg: '#fff3cd', fg: '#856404' },
    both:    { label: 'DG + Battery', bg: '#e8daef', fg: '#7d3c98' },
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="DG & Battery Backup Usage"
        subtitle="Track sites that went on backup"
        leftAction="back"
        onLeftPress={() => navigation.goBack()}
        rightActions={[{ icon: exporting ? 'loader' : 'download', onPress: handleExport }]}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ── Date Picker ── */}
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>Select Date</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
              <Icon name="calendar" size={15} color="#01497C" />
              <Text style={styles.dateBtnTxt}>{fmtDisplay(selectedDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={() => fetchData(selectedDate)}>
              <Text style={styles.applyBtnTxt}>Check Backup</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showPicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            maximumDate={new Date()}
            onChange={(event, date) => {
              if (Platform.OS === 'android') setShowPicker(false);
              if (event.type === 'dismissed') { setShowPicker(false); return; }
              if (date) setSelectedDate(date);
              if (Platform.OS === 'ios') setShowPicker(false);
            }}
          />
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#01497C" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── Stat Cards ── */}
            <View style={styles.statsGrid}>
              <StatCard icon="bar-chart-2" label="Total Sites" value={total} color="#3498db" pct={null} />
              <StatCard icon="zap" label="Sites on DG" value={dgCount} color="#e67e22" pct={pct(dgCount)} fillClass="dg" />
              <StatCard icon="battery-charging" label="Sites on Battery" value={battCount} color="#f39c12" pct={pct(battCount)} fillClass="battery" />
              <StatCard icon="activity" label="Both DG & Battery" value={bothCount} color="#9b59b6" pct={pct(bothCount)} fillClass="both" />
              <StatCard icon="check-circle" label="Total with Backup" value={backupTotal} color="#27ae60" pct={pct(backupTotal)} fillClass="total" />
            </View>

            {/* ── Tabs ── */}
            <View style={styles.tabRow}>
              {(['all', 'dg', 'battery', 'both'] as Tab[]).map(tab => {
                const counts = { all: backupTotal, dg: dgCount, battery: battCount, both: bothCount };
                const labels = { all: `All (${counts.all})`, dg: `DG (${dgCount})`, battery: `Batt (${battCount})`, both: `Both (${bothCount})` };
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>{labels[tab]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Sites List ── */}
            <View style={styles.section}>
              {sites.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Icon name="inbox" size={36} color="#ccc" />
                  <Text style={styles.emptyTxt}>No sites in this category</Text>
                </View>
              ) : sites.map((site: any, idx: number) => {
                const cfg = badgeCfg[site.type] || badgeCfg.dg;
                return (
                  <View key={`${site.imei}-${idx}`} style={[styles.siteCard, idx % 2 === 0 && styles.siteCardAlt]}>
                    {/* Header */}
                    <View style={styles.siteCardHeader}>
                      <Text style={styles.siteId}>{site.site_id}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.typeBadgeTxt, { color: cfg.fg }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    {/* Site Name → navigates to Run Hours */}
                    <TouchableOpacity
                      onPress={() => navigation.navigate('SiteRunHoursDetail', { imei: site.imei, siteName: site.site_name })}
                    >
                      <Text style={styles.siteName}>{site.site_name}</Text>
                    </TouchableOpacity>
                    {/* Durations */}
                    <View style={styles.durGrid}>
                      {site.dg_duration && site.dg_duration !== '00:00:00' && (
                        <DurRow icon="zap" label="DG Duration" val={site.dg_duration} color="#e67e22" />
                      )}
                      {site.battery_duration && site.battery_duration !== '00:00:00' && (
                        <DurRow icon="battery-charging" label="Battery Duration" val={site.battery_duration} color="#f39c12" />
                      )}
                      <DurRow icon="activity" label="Mains Duration" val={site.mains_duration || '00:00:00'} color="#27ae60" />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const colorMap: Record<string, string> = {
  dg: '#e67e22', battery: '#f39c12', both: '#9b59b6', total: '#27ae60',
};

function StatCard({ icon, label, value, color, pct, fillClass }: {
  icon: string; label: string; value: number; color: string; pct: string | null; fillClass?: string;
}) {
  const barColor = fillClass ? colorMap[fillClass] || color : color;
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {pct !== null && (
        <>
          <View style={styles.pctBar}>
            <View style={[styles.pctFill, { width: `${Math.min(parseFloat(pct), 100)}%`, backgroundColor: barColor }]} />
          </View>
          <Text style={styles.pctTxt}>{pct}% of total sites</Text>
        </>
      )}
    </View>
  );
}

function DurRow({ icon, label, val, color }: { icon: string; label: string; val: string; color: string }) {
  return (
    <View style={styles.durRow}>
      <Icon name={icon} size={12} color={color} style={{ marginRight: 4 }} />
      <Text style={styles.durLabel}>{label}:</Text>
      <Text style={[styles.durVal, { color }]}>{val}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBF2FA' },

  // Filter
  filterCard: { margin: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2 },
  filterLabel: { fontSize: 11, color: '#01497C', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', gap: 10 },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#01497C', borderRadius: 8, padding: 10, backgroundColor: '#F0F7FF' },
  dateBtnTxt: { fontSize: 13, color: '#01497C', fontWeight: '700', flex: 1 },
  applyBtn: { backgroundColor: '#01497C', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  applyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Stats
  statsGrid: { marginHorizontal: 12, marginBottom: 10, gap: 10 },
  statCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2, borderLeftWidth: 5 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 36, fontWeight: '800', lineHeight: 42, marginBottom: 8 },
  pctBar: { height: 6, backgroundColor: '#ecf0f1', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  pctFill: { height: '100%', borderRadius: 3 },
  pctTxt: { fontSize: 11, color: '#7f8c8d', fontWeight: '600' },

  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 10, gap: 6 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#d0e8f5', backgroundColor: '#fff', alignItems: 'center' },
  tabActive: { backgroundColor: '#01497C', borderColor: '#01497C' },
  tabTxt: { fontSize: 11, fontWeight: '700', color: '#01497C' },
  tabTxtActive: { color: '#fff' },

  // Section
  section: { marginHorizontal: 12 },

  // Site cards
  siteCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  siteCardAlt: { backgroundColor: '#FAFCFF' },
  siteCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  siteId: { fontSize: 12, fontWeight: '700', color: '#475569' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  typeBadgeTxt: { fontSize: 11, fontWeight: '700' },
  siteName: { fontSize: 14, color: '#2980b9', fontWeight: '700', textDecorationLine: 'underline', marginBottom: 10 },
  durGrid: { gap: 5 },
  durRow: { flexDirection: 'row', alignItems: 'center' },
  durLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginRight: 4 },
  durVal: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTxt: { color: '#94A3B8', marginTop: 10, fontSize: 13, fontStyle: 'italic' },
});
