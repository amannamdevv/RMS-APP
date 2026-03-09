import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { api } from '../api';
import Icon from 'react-native-vector-icons/Feather';
import FilterModal from '../components/FilterModal';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

type Props = NativeStackScreenProps<RootStackParamList, 'SiteTypeDetails'>;

export default function SiteTypeDetailsScreen({ route, navigation }: Props) {
  const { siteType, title, filters } = route.params;
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States - Initialize with filters passed from the previous screen
  const [localFilters, setLocalFilters] = useState(filters || {});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Re-fetch data whenever localFilters change
  useEffect(() => {
    fetchData();
  }, [localFilters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Use localFilters instead of route.params.filters
      const res = await api.getSitesByType(siteType, localFilters);
      if (res.status === 'success') setData(res.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (newFilters: any) => {
    setLocalFilters(newFilters);
  };

  const handleExport = async () => {
    if (data.length === 0) return Alert.alert("No Data", "Nothing to export.");
    const csvRows = ["Site ID,Site Name,Global ID,IMEI,State,District,Cluster,Site Type,DG Presence,EB Presence"];
    data.forEach(s => {
      csvRows.push(`${s.site_id},"${s.site_name}",${s.global_id},${s.imei},${s.state_name},${s.district_name},${s.cluster_name},${s.site_type || '-'},${s.dg_presence || '-'},${s.eb_presence || '-'}`);
    });
    
    const csvString = csvRows.join('\n');
    const fileName = `${title.replace(' ', '_')}_Sites_${new Date().getTime()}.csv`;
    const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
    
    await RNFS.writeFile(filePath, csvString, 'utf8');
    await Share.open({ url: `file://${filePath}`, type: 'text/csv', filename: fileName, showAppsToView: true });
  };

  const renderCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SiteDetails', { imei: item.imei, siteId: item.site_id })}>
      <View style={styles.headerRow}>
        <Text style={styles.siteName}>{item.site_name}</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>{item.site_type || 'Unknown'}</Text></View>
      </View>
      <Text style={styles.subText}>{item.site_id} | {item.imei}</Text>
      
      <View style={styles.infoRow}>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>DG Presence</Text><Text style={styles.infoValue}>{item.dg_presence || 'N/A'}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>EB Presence</Text><Text style={styles.infoValue}>{item.eb_presence || 'N/A'}</Text></View>
      </View>
      <View style={[styles.infoRow, {marginBottom: 0}]}><Text style={styles.infoLabel}>Location:</Text><Text style={styles.infoValue}> {item.state_name} / {item.district_name}</Text></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10 }}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{title} ({data.length})</Text>
        
        {/* Added Filter and Export Icons Row */}
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleExport}>
            <Icon name="download" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setFilterModalVisible(true)}>
            <Icon name="filter" size={22} color="#fff" />
            {Object.keys(localFilters).length > 0 && <View style={styles.activeFilterDot} />}
          </TouchableOpacity>
        </View>
      </View>

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={localFilters}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#1e3c72" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => item.imei + index}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>No sites found for this category.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: '#1e3c72', padding: 16, flexDirection: 'row', alignItems: 'center' },
  backArrow: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },

  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, marginLeft: 5, position: 'relative' },
  activeFilterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#1e3c72' },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  siteName: { fontSize: 16, fontWeight: '700', color: '#1e3c72', flex: 1 },
  subText: { fontSize: 12, color: '#666', marginBottom: 12 },
  badge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#334155' },
  
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase' },
  infoValue: { fontSize: 13, color: '#333', fontWeight: '600' }
});