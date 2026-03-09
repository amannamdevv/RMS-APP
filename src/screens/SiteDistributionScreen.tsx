import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { api } from '../api';
import FilterModal from '../components/FilterModal';
import Icon from 'react-native-vector-icons/Feather';

type Props = NativeStackScreenProps<RootStackParamList, 'SiteDistribution'>;

export default function SiteDistributionScreen({ navigation }: Props) {
  const [counts, setCounts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeFilters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getSiteDistributionCounts(activeFilters);
      if (res.status === 'success') {
        setCounts(res.data);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, val1, label1, key1, val2, label2, key2, color1, color2 }: any) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.row}>
        <TouchableOpacity 
            style={[styles.box, { backgroundColor: color1 + '15', borderColor: color1 }]}
            onPress={() => navigation.navigate('SiteTypeDetails', { siteType: key1, title: label1, filters: activeFilters })}
        >
          <Text style={[styles.boxVal, { color: color1 }]}>{val1 || 0}</Text>
          <Text style={styles.boxLabel}>{label1}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
            style={[styles.box, { backgroundColor: color2 + '15', borderColor: color2 }]}
            onPress={() => navigation.navigate('SiteTypeDetails', { siteType: key2, title: label2, filters: activeFilters })}
        >
          <Text style={[styles.boxVal, { color: color2 }]}>{val2 || 0}</Text>
          <Text style={styles.boxLabel}>{label2}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Site Distribution</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setFilterModalVisible(true)}>
          <Icon name="filter" size={22} color="#fff" />
          {Object.keys(activeFilters).length > 0 && <View style={styles.activeFilterDot} />}
        </TouchableOpacity>
      </View>

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={setActiveFilters}
        initialFilters={activeFilters}
      />

      {loading || !counts ? (
        <ActivityIndicator size="large" color="#1e3c72" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.totalText}>Total Analyzed Sites: {counts.total}</Text>

          <MetricCard title="BSC vs Hub Sites" 
            val1={counts.bsc} label1="BSC" key1="bsc" color1="#0ea5e9"
            val2={counts.hub} label2="Hub" key2="hub" color2="#3b82f6" />

          <MetricCard title="DG Presence Status" 
            val1={counts.dg} label1="With DG" key1="dg" color1="#f59e0b"
            val2={counts.non_dg} label2="Without DG" key2="non_dg" color2="#ef4444" />

          <MetricCard title="EB Presence Status" 
            val1={counts.eb} label1="With EB" key1="eb" color1="#10b981"
            val2={counts.non_eb} label2="Without EB" key2="non_eb" color2="#64748b" />

          <MetricCard title="Indoor vs Outdoor" 
            val1={counts.indoor} label1="Indoor" key1="indoor" color1="#8b5cf6"
            val2={counts.outdoor} label2="Outdoor" key2="outdoor" color2="#6366f1" />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tower Type Distribution</Text>
            <View style={styles.grid}>
              {[
                {k: 'rtt', l: 'RTT', c: '#0ea5e9'}, {k: 'rtp', l: 'RTP', c: '#3b82f6'},
                {k: 'gbt', l: 'GBT', c: '#6366f1'}, {k: 'small_cell', l: 'Small Cell', c: '#8b5cf6'}
              ].map(t => (
                <TouchableOpacity key={t.k} style={[styles.gridBox, { borderColor: t.c, backgroundColor: t.c + '10' }]} onPress={() => navigation.navigate('SiteTypeDetails', { siteType: t.k, title: t.l, filters: activeFilters })}>
                    <Text style={[styles.boxVal, { color: t.c }]}>{counts[t.k] || 0}</Text>
                    <Text style={styles.boxLabel}>{t.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: '#1e3c72', padding: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { paddingRight: 10 },
  backArrow: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },
  iconBtn: { padding: 8, position: 'relative' },
  activeFilterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#1e3c72' },
  
  content: { padding: 16 },
  totalText: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e3c72', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  box: { flex: 1, padding: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridBox: { width: '48%', padding: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  boxVal: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  boxLabel: { fontSize: 12, fontWeight: '600', color: '#666', textTransform: 'uppercase' },
});