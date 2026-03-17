import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, SafeAreaView, RefreshControl, Alert
} from 'react-native';
import { api } from '../../api';
import Icon from 'react-native-vector-icons/Feather';
import FilterModal from '../../components/FilterModal';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

// Helper to convert JSON array to CSV string
const convertToCSV = (objArray: any[]) => {
  if (!objArray || objArray.length === 0) return '';
  const allHeadersSet = new Set<string>();
  objArray.forEach(obj => Object.keys(obj).forEach(key => {
    if (typeof obj[key] !== 'object') {
        allHeadersSet.add(key);
    }
  }));
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

export default function SiteAutomationScreen({ navigation }: any) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [activeFilters, setActiveFilters] = useState({});
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetchAutomationData();
    }, [statusFilter, activeFilters]);

    const fetchAutomationData = async () => {
        setLoading(true);
        try {
            const res = await api.getAutomationDetails({ status: statusFilter, ...activeFilters });
            if (res && res.status === 'success') {
                setData(res.data);
            }
        } catch (e) {
            console.error("Automation Fetch Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            // Fetch comprehensive set for export
            const res = await api.getAutomationDetails({ status: statusFilter, ...activeFilters }, 1, 10000);
            const exportData = (res && res.status === 'success') ? res.data : [];

            if (exportData.length === 0) {
                Alert.alert("No Data", "Export ke liye koi data nahi mil raha.");
                return;
            }

            const csvString = convertToCSV(exportData);
            const fileName = `Automation_Details_${new Date().getTime()}.csv`;
            const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

            await RNFS.writeFile(filePath, csvString, 'utf8');
            await Share.open({
                title: 'Export Automation Details',
                url: `file://${filePath}`,
                type: 'text/csv',
                filename: fileName,
                showAppsToView: true,
            });
        } catch (error: any) {
            if (error?.message !== 'User did not share') {
                Alert.alert("Export Error", "Export fail ho gaya.");
            }
        } finally {
            setExporting(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const renderSequenceItem = (seq: any, idx: number) => {
        const isCorrect = seq.status === 'correct';
        return (
            <View key={idx} style={[styles.seqBox, { borderLeftColor: isCorrect ? '#4caf50' : '#f44336' }]}>
                <View style={styles.seqHeader}>
                    <Text style={[styles.seqStatus, { color: isCorrect ? '#4caf50' : '#f44336' }]}>
                        {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </Text>
                    <Text style={styles.seqTime}>{seq.timestamp}</Text>
                </View>

                {seq.time_to_battery !== undefined && (
                    <Text style={styles.seqText}>
                        Time to Battery: <Text style={styles.bold}>{seq.time_to_battery === 'instant' ? 'Instant' : seq.time_to_battery + 's'}</Text> | 
                        Time to DG: <Text style={styles.bold}>{seq.time_to_dg === 'instant' ? 'Instant' : seq.time_to_dg + 's'}</Text>
                    </Text>
                )}

                {seq.note && <Text style={styles.note}>Note: {seq.note}</Text>}
                {seq.issue && <Text style={styles.issue}>Issue: {seq.issue}</Text>}
            </View>
        );
    };

    const renderCard = ({ item }: { item: any }) => {
        const isExpanded = expandedId === item.site_id;
        const totalChecked = (item.sequence_analysis.correct_sequences || 0) + (item.sequence_analysis.incorrect_sequences || 0);

        return (
            <View style={styles.card}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('SiteDetails', { imei: item.imei, siteId: item.site_id })}
                >
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.siteName}>{item.site_name}</Text>
                            <Text style={styles.subText}>ID: {item.site_id} | Global: {item.global_id || 'N/A'}</Text>
                        </View>
                        <View style={[styles.tag, item.is_automated ? styles.tagAuto : styles.tagNotAuto]}>
                            <Text style={[styles.tagText, { color: item.is_automated ? '#4caf50' : '#f44336' }]}>
                                {item.is_automated ? 'UNDER AUTO' : 'NOT AUTO'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.locRow}>
                        <Text style={styles.locText}><Icon name="map-pin" size={10} /> {item.state_name} / {item.district_name}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoCol}>
                            <Text style={styles.label}>Auto Rate</Text>
                            <Text style={[styles.val, { color: '#2196f3' }]}>{item.sequence_analysis.automation_rate}%</Text>
                        </View>

                        <View style={styles.infoCol}>
                            <Text style={styles.label}>Sequences</Text>
                            <Text style={styles.val}>
                                {item.sequence_analysis.correct_sequences}/{totalChecked} Correct
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.expandBtn}
                            onPress={() => toggleExpand(item.site_id)}
                        >
                            <Text style={styles.expandText}>{isExpanded ? 'Hide' : 'Details'}</Text>
                            <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#2196f3" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.detailsContainer}>
                        <Text style={styles.analysisTitle}>Analysis Feedback:</Text>
                        <Text style={styles.feedbackText}>{item.sequence_analysis.feedback}</Text>

                        <Text style={[styles.analysisTitle, { marginTop: 10 }]}>Recent Sequences (Last 5):</Text>
                        {item.sequence_analysis.sequence_details && item.sequence_analysis.sequence_details.length > 0 ? (
                            item.sequence_analysis.sequence_details.slice(0, 5).map((seq: any, idx: number) =>
                                renderSequenceItem(seq, idx)
                            )
                        ) : (
                            <Text style={styles.emptyText}>No sequence data available</Text>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-left" size={24} color="#fff" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Automation Details</Text>
                
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
                onApply={(f) => setActiveFilters(f)} 
                initialFilters={activeFilters} 
            />

            <View style={styles.statusFilterContainer}>
                {['all', 'automated', 'not_automated'].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.statusFilterBtn, statusFilter === f && styles.statusFilterBtnActive]}
                        onPress={() => setStatusFilter(f)}
                    >
                        <Text style={[styles.statusFilterText, statusFilter === f && styles.statusFilterTextActive]}>
                            {f === 'all' ? 'All' : f === 'automated' ? 'Automated' : 'Manual'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#1e3c72" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(item, index) => (item.site_id || index).toString()}
                    renderItem={renderCard}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAutomationData(); }} />}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: '#888' }}>No automation sites found.</Text>}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#c5d4ee' },
    header: { backgroundColor: '#1e3c72', padding: 16, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, marginLeft: 15 },
    headerIcons: { flexDirection: 'row', alignItems: 'center' },
    iconBtn: { padding: 8, position: 'relative' },
    activeFilterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#1e3c72' },

    statusFilterContainer: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, gap: 8 },
    statusFilterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 20, backgroundColor: '#f0f4f8' },
    statusFilterBtnActive: { backgroundColor: '#1e3c72' },
    statusFilterText: { fontSize: 12, color: '#1e3c72', fontWeight: '600' },
    statusFilterTextActive: { color: '#fff' },

    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    siteName: { fontSize: 15, fontWeight: '700', color: '#1e3c72' },
    subText: { fontSize: 11, color: '#666', marginTop: 2 },
    locRow: { marginTop: 4 },
    locText: { fontSize: 11, color: '#888' },
    tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    tagAuto: { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
    tagNotAuto: { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
    tagText: { fontSize: 9, fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoCol: { flex: 1 },
    label: { fontSize: 9, color: '#999', textTransform: 'uppercase' },
    val: { fontSize: 12, fontWeight: '700', marginTop: 1 },
    expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 5 },
    expandText: { fontSize: 12, color: '#2196f3', fontWeight: '600' },
    detailsContainer: { marginTop: 15, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderTopWidth: 1, borderTopColor: '#eee' },
    analysisTitle: { fontSize: 11, fontWeight: 'bold', color: '#475569', marginBottom: 5 },
    feedbackText: { fontSize: 12, color: '#334155', lineHeight: 18 },
    seqBox: { backgroundColor: '#fff', padding: 10, borderRadius: 6, marginBottom: 8, borderLeftWidth: 3, elevation: 1 },
    seqHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    seqStatus: { fontSize: 11, fontWeight: 'bold' },
    seqTime: { fontSize: 10, color: '#999' },
    seqText: { fontSize: 11, color: '#444' },
    bold: { fontWeight: 'bold' },
    note: { fontSize: 10, color: '#666', fontStyle: 'italic', marginTop: 4 },
    issue: { fontSize: 10, color: '#dc2626', marginTop: 4, fontWeight: '500' },
    emptyText: { fontSize: 11, color: '#999', fontStyle: 'italic', textAlign: 'center' }
});