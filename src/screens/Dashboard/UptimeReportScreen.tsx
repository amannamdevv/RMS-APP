import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, SafeAreaView, RefreshControl, Alert
} from 'react-native';
import { api } from '../../api';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import * as Animatable from 'react-native-animatable';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import FilterModal from '../../components/FilterModal';

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

export default function UptimeReportScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [reportData, setReportData] = useState<any[]>([]);
    const [activeFilters, setActiveFilters] = useState({});
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [summary, setSummary] = useState<any>(null);

    const handleExport = async () => {
        setExporting(true);
        try {
            if (reportData.length === 0) {
                Alert.alert("No Data", "No data available to export.");
                return;
            }
            const csvString = convertToCSV(reportData);
            const fileName = `Uptime_Report_${new Date().getTime()}.csv`;
            const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

            await RNFS.writeFile(filePath, csvString, 'utf8');
            await Share.open({
                title: 'Export Uptime Report',
                url: `file://${filePath}`,
                type: 'text/csv',
                filename: fileName,
                showAppsToView: true,
            });
        } catch (error: any) {
            if (error?.message !== 'User did not share') {
                Alert.alert("Export Error", "Export failed.");
            }
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [activeFilters]);

    const fetchReport = async () => {
        if (!refreshing) setLoading(true);
        try {
            const res = await api.getUptimeSummary(activeFilters);
            if (res && res.status === 'success') {
                setReportData(res.state_report || []);
                setSummary(res.summary);
            }
        } catch (e) {
            console.error("Uptime Report Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const renderStateCard = ({ item, index }: { item: any, index: number }) => (
        <Animatable.View animation="fadeInLeft" delay={index * 100} style={styles.card}>
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => navigation.navigate('UptimeDetails', { 
                    state_id: item.state_id, 
                    state_name: item.state_name 
                })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.stateInfo}>
                        <Text style={styles.stateName}>{item.state_name}</Text>
                        <Text style={styles.totalSites}>{item.total_sites} Total Sites</Text>
                    </View>
                    <View style={styles.percentageContainer}>
                        <Text style={[styles.percentageText, { color: item.overall_uptime_percent >= 99 ? '#2E7D32' : '#C62828' }]}>
                            {item.overall_uptime_percent}%
                        </Text>
                        <Text style={styles.percentageLabel}>Overall Uptime</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <MaterialIcon name="check-decagram" size={18} color="#4caf50" />
                        <View style={{ marginLeft: 8 }}>
                            <Text style={styles.statVal}>{item.sites_met_sla}</Text>
                            <Text style={styles.statLab}>SLA Met</Text>
                        </View>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.statBox}>
                        <MaterialIcon name="alert-decagram" size={18} color="#f44336" />
                        <View style={{ marginLeft: 8 }}>
                            <Text style={styles.statVal}>{item.sites_not_met_sla}</Text>
                            <Text style={styles.statLab}>Not Met</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.footerText}>Tap to view site-wise details</Text>
                    <Icon name="arrow-right" size={14} color="#1e3c72" />
                </View>
            </TouchableOpacity>
        </Animatable.View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.header}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>State-wise Uptime Report</Text>
                    
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.headerIcon} onPress={handleExport} disabled={exporting}>
                            {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="download" size={22} color="#fff" />}
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.headerIcon} onPress={() => setFilterModalVisible(true)}>
                            <Icon name="filter" size={22} color="#fff" />
                            {Object.keys(activeFilters).length > 0 && <View style={styles.filterDot} />}
                        </TouchableOpacity>
                    </View>
                </View>

                <FilterModal 
                    visible={filterModalVisible} 
                    onClose={() => setFilterModalVisible(false)} 
                    onApply={(f) => setActiveFilters(f)} 
                    initialFilters={activeFilters} 
                />
                
                {summary && (
                    <Animatable.View animation="fadeIn" style={styles.summaryBox}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryVal}>{summary.total_states}</Text>
                            <Text style={styles.summaryLab}>States</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryVal}>{summary.total_sites}</Text>
                            <Text style={styles.summaryLab}>Sites</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryVal}>{summary.report_date?.split('-').reverse().join('/')}</Text>
                            <Text style={styles.summaryLab}>As Of</Text>
                        </View>
                    </Animatable.View>
                )}
            </LinearGradient>

            {loading && !refreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#1e3c72" />
                    <Text style={styles.loadingText}>Generating Report...</Text>
                </View>
            ) : (
                <FlatList
                    data={reportData}
                    keyExtractor={(item) => item.state_id.toString()}
                    renderItem={renderStateCard}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReport(); }} colors={['#1e3c72']} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcon name="file-document-outline" size={60} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No Uptime Data Available</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    header: { padding: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 10 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, marginLeft: 15 },
    headerIcons: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: { padding: 8, position: 'relative' },
    filterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#1e3c72' },
    summaryBox: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 15, padding: 15 },
    summaryItem: { alignItems: 'center' },
    summaryVal: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    summaryLab: { color: 'rgba(255,255,255,0.7)', fontSize: 10, textTransform: 'uppercase', marginTop: 2 },
    
    listContainer: { padding: 15 },
    card: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 15, elevation: 3, padding: 15, borderLeftWidth: 5, borderLeftColor: '#1e3c72' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stateInfo: { flex: 1 },
    stateName: { fontSize: 18, fontWeight: 'bold', color: '#1e3c72' },
    totalSites: { fontSize: 12, color: '#64748b', marginTop: 2 },
    percentageContainer: { alignItems: 'flex-end' },
    percentageText: { fontSize: 22, fontWeight: 'bold' },
    percentageLabel: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' },
    
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
    statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 12 },
    statBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    statVal: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
    statLab: { fontSize: 10, color: '#64748b', marginLeft: 2 },
    verticalDivider: { width: 1, height: '60%', backgroundColor: '#e2e8f0' },
    
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f8fafc' },
    footerText: { fontSize: 10, color: '#64748b', fontStyle: 'italic' },
    
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, color: '#1e3c72', fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 15, fontSize: 16, color: '#94a3b8', fontWeight: 'bold' }
});
