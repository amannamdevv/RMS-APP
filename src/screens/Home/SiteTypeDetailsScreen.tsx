import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { api } from '../../api';
import Icon from 'react-native-vector-icons/Feather';
import FilterModal from '../../components/FilterModal';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

type Props = NativeStackScreenProps<RootStackParamList, 'SiteTypeDetails'>;

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

export default function SiteTypeDetailsScreen({ route, navigation }: Props) {
  const { siteType, title, filters } = route.params;
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters || {});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all sites of this type with filters for export
      const res = await api.getSitesByType(siteType, localFilters, 1, 10000);
      
      const sitesToExport = (res && res.status === 'success') ? res.data : [];

      if (sitesToExport.length === 0) {
        Alert.alert("No Data", "There are no sites to export with current filters.");
        return;
      }

      const csvString = convertToCSV(sitesToExport);
      const fileName = `Sites_${title.replace(/\s+/g, '_')}_${new Date().getTime()}.csv`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, csvString, 'utf8');
      await Share.open({
        title: 'Export Site List',
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
    fetchData();
  }, [localFilters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getSitesByType(siteType, localFilters);
      // Django backend returns the list in 'res.data' for this API
      if (res && res.status === 'success' && res.data) {
        setData(res.data);
      } else {
        setData([]);
      }
    } catch (e) {
      console.error("Fetch Error:", e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderCard = ({ item }: { item: any }) => {
    // MAPPING: Use global_id because your backend SQL specifically selects this
    const globalId = item.site_global_id || '';
    const imei = item.imei || '';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (imei || globalId) {
            // We pass both; SiteDetails will decide which one to fetch with
            navigation.navigate('SiteDetails', {
              imei: imei,
              siteId: globalId.toString()
            });
          } else {
            Alert.alert("Notice", "No unique identification found for this site.");
          }
        }}
      >
        <View style={styles.headerRow}>
          <Text style={styles.siteName} numberOfLines={1}>{item.site_name || 'Unnamed Site'}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.site_type || 'SITE'}</Text>
          </View>
        </View>

        <Text style={styles.subText}>
          {globalId ? `Global ID: ${globalId}` : 'No ID Found'}
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>DG Presence</Text>
            <Text style={styles.infoValue}>{item.dg_presence || 'N/A'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>EB Presence</Text>
            <Text style={styles.infoValue}>{item.eb_presence || 'N/A'}</Text>
          </View>
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
        <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSub}>Displaying {data.length} sites</Text>
        </View>
        
        <TouchableOpacity style={styles.iconBtn} onPress={handleExport} disabled={exporting}>
          {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="download" size={22} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={() => setFilterModalVisible(true)}>
          <Icon name="filter" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(f: any) => setLocalFilters(f)}
        initialFilters={localFilters}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#1e3c72" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => (item.site_global_id || index).toString()}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Text style={{ color: '#888' }}>No sites found in this category.</Text>
            </View>
          }
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#94a3b8', fontSize: 11 },
  iconBtn: { padding: 8 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  siteName: { fontSize: 16, fontWeight: '700', color: '#1e3c72', flex: 1 },
  subText: { fontSize: 12, color: '#666', marginBottom: 12 },
  badge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#334155' },
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase' },
  infoValue: { fontSize: 13, color: '#333', fontWeight: '600' }
});