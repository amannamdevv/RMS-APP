import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, SafeAreaView, RefreshControl, Alert
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { api } from '../../api';
import Icon from 'react-native-vector-icons/Feather';
import FilterModal from '../../components/FilterModal';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

type Props = NativeStackScreenProps<RootStackParamList, 'SiteVitals'>;

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

export default function SiteVitalsScreen({ route, navigation }: Props) {
    // Params like 'range' can come from Dashboard navigation
    const { range } = route.params || {};

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(true);
    const [totalSites, setTotalSites] = useState(0);
    const [rangeLabel, setRangeLabel] = useState('All Sites');

    const [activeFilters, setActiveFilters] = useState<any>(range ? { range } : {});
    const [filterModalVisible, setFilterModalVisible] = useState(false);

    // Sync filters if range changes from navigation (Sidebar)
    useEffect(() => {
        if (route.params?.range) {
            setActiveFilters((prev: any) => ({ ...prev, range: route.params?.range }));
        }
    }, [route.params?.range]);

    useEffect(() => {
        fetchData(1, true);
    }, [activeFilters]);

    const fetchData = async (pageNum = 1, isRefresh = false) => {
        if (loading && !isRefresh) return;
        setLoading(true);
        try {
            const res = await api.getSiteVitals(activeFilters, pageNum);

            if (res && res.sites) {
                if (isRefresh) setData(res.sites);
                else setData(prev => [...prev, ...res.sites]);

                setTotalSites(res.total_sites);
                setRangeLabel(res.range_label);
                setHasNext(res.has_next);
                setPage(pageNum);
            }
        } catch (e) {
            console.error("Vitals API Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            // Fetch a comprehensive set for export to respect "Download All"
            const res = await api.getSiteVitals(activeFilters, 1, 10000);
            if (res && res.sites) {
                if (res.sites.length === 0) {
                    Alert.alert("No Data", "There is no data to export with the current filters.");
                    return;
                }
                const csvString = convertToCSV(res.sites);
                const fileName = `Site_Vitals_${new Date().getTime()}.csv`;
                const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

                await RNFS.writeFile(filePath, csvString, 'utf8');
                await Share.open({
                    title: 'Export Site Vitals',
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

    const getVoltageStyle = (voltage: any) => {
        if (!voltage || voltage === '0.00' || isNaN(parseFloat(voltage))) return { color: '#9e9e9e', label: 'NA' };
        const v = parseFloat(voltage);
        if (v <= 47) return { color: '#f44336', label: `${v.toFixed(2)}V` }; // Critical
        if (v <= 49) return { color: '#ff9800', label: `${v.toFixed(2)}V` }; // Low
        if (v <= 54.5) return { color: '#2196f3', label: `${v.toFixed(2)}V` }; // Operational
        return { color: '#4caf50', label: `${v.toFixed(2)}V` }; // High
    };

    const renderCard = ({ item }: { item: any }) => {
        const vStyle = getVoltageStyle(item.battery_v);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('SiteDetails', { imei: item.imei, siteId: item.site_id })}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.siteName}>{item.site_name || 'Unnamed Site'}</Text>
                        <Text style={styles.subText}>ID: {item.site_id} | {item.imei}</Text>
                    </View>
                    <View style={[styles.voltageBox, { backgroundColor: vStyle.color + '15' }]}>
                        <Text style={[styles.voltageText, { color: vStyle.color }]}>{vStyle.label}</Text>
                        <Text style={styles.miniLabel}>Battery</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <View style={styles.infoCol}>
                        <Icon name="map-pin" size={12} color="#666" />
                        <Text style={styles.infoValue}>{item.state_name || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Icon name="grid" size={12} color="#666" />
                        <Text style={styles.infoValue}>{item.dist_name || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Icon name="layers" size={12} color="#666" />
                        <Text style={styles.infoValue}>{item.cluster_name || 'N/A'}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Site Vitals</Text>
                    <Text style={styles.headerSub}>{rangeLabel} ({totalSites})</Text>
                </View>
                
                <TouchableOpacity style={styles.iconBtn} onPress={handleExport} disabled={exporting}>
                    {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="download" size={22} color="#fff" />}
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn} onPress={() => setFilterModalVisible(true)}>
                    <Icon name="filter" size={22} color="#fff" />
                    {Object.keys(activeFilters).length > 0 && <View style={styles.activeFilterDot} />}
                </TouchableOpacity>
            </View>

            <FilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={(f: any) => { setActiveFilters(f); setFilterModalVisible(false); }}
                initialFilters={activeFilters}
            />

            <FlatList
                data={data}
                keyExtractor={(item, index) => (item.imei || index).toString()}
                renderItem={renderCard}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(1, true)} />}
                onEndReached={() => hasNext && fetchData(page + 1)}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loading ? <ActivityIndicator size="small" color="#1e3c72" style={{ margin: 20 }} /> : null}
                ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No sites found for this range.</Text> : null}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#c5d4eeff' },
    header: { backgroundColor: '#1e3c72', padding: 16, flexDirection: 'row', alignItems: 'center' },
    backBtn: { paddingRight: 15 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    headerSub: { color: '#A9D6E5', fontSize: 12 },
    iconBtn: { padding: 8, position: 'relative' },
    activeFilterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#1e3c72' },

    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    siteName: { fontSize: 15, fontWeight: '700', color: '#1e3c72', marginBottom: 2 },
    subText: { fontSize: 11, color: '#666' },

    voltageBox: { padding: 8, borderRadius: 8, alignItems: 'center', minWidth: 70 },
    voltageText: { fontSize: 16, fontWeight: '800' },
    miniLabel: { fontSize: 9, color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },

    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
    infoCol: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
    infoValue: { fontSize: 11, color: '#444', fontWeight: '500' },

    emptyText: { textAlign: 'center', marginTop: 50, color: '#888', fontSize: 14 }
});