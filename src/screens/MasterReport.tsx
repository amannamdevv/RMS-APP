import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, SafeAreaView, Dimensions, RefreshControl, StatusBar, Platform, Modal, TextInput, Linking
} from 'react-native';
import { api } from '../api';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import Sidebar from '../components/Sidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logoutApi } from '../api/auth';
import DateTimePicker from '@react-native-community/datetimepicker';

const screenWidth = Dimensions.get('window').width;

export default function MasterReport({ navigation }: any) {
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [listData, setListData] = useState<any[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isSidebarVisible, setSidebarVisible] = useState(false);
    const [fullname, setFullname] = useState('Administrator');

    // Filter States
    const [date, setDate] = useState(new Date());
    const [siteName, setSiteName] = useState('');
    const [siteId, setSiteId] = useState('');
    const [globalId, setGlobalId] = useState('');
    const [imei, setImei] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [expandedIds, setExpandedIds] = useState<string[]>([]);

    useEffect(() => {
        const loadUser = async () => {
            const name = await AsyncStorage.getItem('user_fullname');
            if (name) setFullname(name);
        };
        loadUser();
    }, []);

    const fetchReportData = async (page = 1) => {
        if (!date) return;

        setLoading(true);
        try {
            const params = {
                date: date.toISOString().split('T')[0],
                site_name: siteName,
                site_id: siteId,
                global_id: globalId,
                imei: imei,
            };

            const res = await api.getMasterReport(params, page);

            if (res.results) {
                setListData(res.results);
                setTotalRecords(res.count);
                setTotalPages(res.total_pages);
                setCurrentPage(res.current_page);
            } else {
                setListData([]);
                setTotalRecords(0);
                setTotalPages(1);
            }
        } catch (e) {
            console.log("Master Report Fetch Error", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleApplyFilters = () => {
        setCurrentPage(1);
        fetchReportData(1);
    };

    const handleExport = () => {
        const params = new URLSearchParams({
            export: 'excel',
            date: date.toISOString().split('T')[0],
            site_name: siteName,
            site_id: siteId,
            global_id: globalId,
            imei: imei,
        }).toString();

        const url = `http://rms.shrotitele.com/api/rms/master-report/?${params}`;
        Linking.openURL(url);
    };

    const toggleExpand = (id: string) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const renderItem = (item: any, index: number) => {
        const uniqueId = `${item.imei}-${index}`;
        const isExpanded = expandedIds.includes(uniqueId);

        return (
            <TouchableOpacity
                key={uniqueId}
                style={[styles.reportCard, item.active_alarms_count > 0 && styles.alarmCard]}
                onPress={() => toggleExpand(uniqueId)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.siteName}>{item.site_name}</Text>
                        <Text style={styles.siteId}>ID: {item.site_id} | Global: {item.global_id}</Text>
                    </View>
                    <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
                </View>

                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Mains R/Y/B</Text>
                        <Text style={styles.summaryValue}>{item.mains_r}/{item.mains_y}/{item.mains_b}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>DG R/Y/B</Text>
                        <Text style={styles.summaryValue}>{item.dg_r}/{item.dg_y}/{item.dg_b}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Batt Volt</Text>
                        <Text style={[styles.summaryValue, { color: '#2ecc71' }]}>{item.bts_volt}V</Text>
                    </View>
                </View>

                <View style={styles.durationRow}>
                    <View style={styles.durBox}>
                        <Icon name="zap" size={10} color="#3498db" />
                        <Text style={styles.durText}>Mains: {item.mains_duration}</Text>
                    </View>
                    <View style={styles.durBox}>
                        <Icon name="activity" size={10} color="#e67e22" />
                        <Text style={styles.durText}>DG: {item.dg_duration}</Text>
                    </View>
                    <View style={styles.durBox}>
                        <Icon name="battery" size={10} color="#2ecc71" />
                        <Text style={styles.durText}>Batt: {item.bts_duration}</Text>
                    </View>
                </View>

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        <View style={styles.divider} />

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>IMEI:</Text>
                            <Text style={styles.detailValue}>{item.imei}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Active Alarms:</Text>
                            <Text style={[styles.detailValue, { color: item.active_alarms_count > 0 ? '#e74c3c' : '#2ecc71' }]}>
                                {item.active_alarms_count || 0} ({item.active_alarms || 'None'})
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Last Alarm:</Text>
                            <Text style={styles.detailValue}>{item.last_alarm || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Alarm Start/End:</Text>
                            <Text style={styles.detailValueSmall}>
                                {item.alarm_start ? new Date(item.alarm_start).toLocaleString() : '-'} / {item.alarm_end ? new Date(item.alarm_end).toLocaleString() : '-'}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Volt Start/End:</Text>
                            <Text style={styles.detailValue}>{item.start_volt || '-'} / {item.end_volt || '-'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Updated At:</Text>
                            <Text style={styles.detailValue}>{item.updated_time ? new Date(item.updated_time).toLocaleString() : '-'}</Text>
                        </View>

                        <Text style={styles.sectionTitle}>System Settings</Text>
                        <View style={styles.settingsGrid}>
                            <View style={styles.settingItem}>
                                <Text style={styles.settingLabel}>Batt LVD Trip</Text>
                                <Text style={styles.settingValue}>{item.battery_lvd_trip || '-'}</Text>
                            </View>
                            <View style={styles.settingItem}>
                                <Text style={styles.settingLabel}>Load LVD Trip</Text>
                                <Text style={styles.settingValue}>{item.load_lvd_trip || '-'}</Text>
                            </View>
                            <View style={styles.settingItem}>
                                <Text style={styles.settingLabel}>Batt Low Alm</Text>
                                <Text style={styles.settingValue}>{item.battery_low_alarm || '-'}</Text>
                            </View>
                            <View style={styles.settingItem}>
                                <Text style={styles.settingLabel}>VRLA AH</Text>
                                <Text style={styles.settingValue}>{item.vrla_ah_setting || '-'}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.topHeader}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => setSidebarVisible(true)}>
                        <Icon name="menu" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.topTitle}>RMS Master Report</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.headerStats}>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{totalRecords}</Text>
                        <Text style={styles.statLab}>Total Records</Text>
                    </View>
                    <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
                        <Icon name="download" size={16} color="#fff" />
                        <Text style={styles.exportText}>Excel</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Advanced Filter Section */}
                <View style={styles.filterSection}>
                    <View style={styles.filterRow}>
                        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                            <Text style={styles.filterLabel}>Select Date</Text>
                            <View style={styles.dateValueWrap}>
                                <Icon name="calendar" size={14} color="#1e3c72" />
                                <Text style={styles.dateValueText}>{date.toISOString().split('T')[0]}</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.filterLabel}>Site Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter site name"
                                value={siteName}
                                onChangeText={setSiteName}
                            />
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.filterLabel}>Site ID</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter site ID"
                                value={siteId}
                                onChangeText={setSiteId}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.filterLabel}>Global ID</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter Global ID"
                                value={globalId}
                                onChangeText={setGlobalId}
                            />
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.filterLabel}>GSM IMEI No</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter IMEI"
                                value={imei}
                                onChangeText={setImei}
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilters}>
                        <Icon name="search" color="#fff" size={16} />
                        <Text style={styles.applyBtnText}>Search Report</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.listContainer}>
                    {loading ? (
                        <ActivityIndicator color="#1e3c72" size="large" style={{ marginTop: 50 }} />
                    ) : listData.length > 0 ? (
                        listData.map((item, idx) => renderItem(item, idx))
                    ) : (
                        <View style={styles.noData}>
                            <Icon name="search" size={50} color="#cbd5e1" />
                            <Text style={styles.noDataText}>Enter filters and search</Text>
                        </View>
                    )}
                </View>

                {/* Pagination */}
                {totalPages > 1 && (
                    <View style={styles.pagination}>
                        <TouchableOpacity
                            disabled={currentPage === 1}
                            onPress={() => fetchReportData(currentPage - 1)}
                            style={[styles.pageBtn, currentPage === 1 && { opacity: 0.5 }]}
                        >
                            <Icon name="chevron-left" size={20} color="#1e3c72" />
                        </TouchableOpacity>
                        <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
                        <TouchableOpacity
                            disabled={currentPage === totalPages}
                            onPress={() => fetchReportData(currentPage + 1)}
                            style={[styles.pageBtn, currentPage === totalPages && { opacity: 0.5 }]}
                        >
                            <Icon name="chevron-right" size={20} color="#1e3c72" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={(e, d) => {
                        setShowDatePicker(false);
                        if (d) setDate(d);
                    }}
                />
            )}

            <Sidebar
                isVisible={isSidebarVisible} onClose={() => setSidebarVisible(false)} navigation={navigation}
                fullname={fullname} activeRoute="MasterReport"
                handleLogout={async () => { await AsyncStorage.removeItem('user_fullname'); await logoutApi(); navigation.replace('Login'); }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    topHeader: { padding: 15, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: Platform.OS === 'ios' ? 0 : 10 },
    topTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    headerStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statBox: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
    statVal: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    statLab: { color: 'rgba(255,255,255,0.8)', fontSize: 10, textTransform: 'uppercase' },
    exportBtn: { backgroundColor: '#2ecc71', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10 },
    exportText: { color: '#fff', fontWeight: 'bold', marginLeft: 6 },

    filterSection: { backgroundColor: '#fff', padding: 15, marginHorizontal: 15, borderRadius: 15, marginTop: -10, elevation: 4, zIndex: 10 },
    filterRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    filterLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 5 },
    datePickerBtn: { flex: 0.8, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center' },
    dateValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateValueText: { fontSize: 14, color: '#1e3c72', fontWeight: 'bold' },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontSize: 14, color: '#1e293b' },
    applyBtn: { backgroundColor: '#1e3c72', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, marginTop: 5 },
    applyBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },

    listContainer: { padding: 15 },
    reportCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3, borderLeftWidth: 5, borderLeftColor: '#3498db' },
    alarmCard: { borderLeftColor: '#e74c3c', backgroundColor: '#fff5f5' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    siteName: { fontSize: 15, fontWeight: '900', color: '#1e293b' },
    siteId: { fontSize: 11, color: '#64748b', marginTop: 2 },

    summaryRow: { flexDirection: 'row', gap: 15, marginBottom: 12 },
    summaryItem: { flex: 1 },
    summaryLabel: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' },
    summaryValue: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },

    durationRow: { flexDirection: 'row', gap: 10, backgroundColor: '#f8fafc', padding: 8, borderRadius: 8 },
    durBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    durText: { fontSize: 10, color: '#475569', fontWeight: 'bold' },

    expandedContent: { marginTop: 15 },
    divider: { height: 1, backgroundColor: '#e2e8f0', marginBottom: 15 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    detailLabel: { fontSize: 12, color: '#64748b' },
    detailValue: { fontSize: 12, color: '#1e293b', fontWeight: 'bold', flex: 1, textAlign: 'right', marginLeft: 10 },
    detailValueSmall: { fontSize: 10, color: '#1e293b', fontWeight: 'bold', flex: 1, textAlign: 'right', marginLeft: 10 },

    sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#1e3c72', marginTop: 15, marginBottom: 10, textTransform: 'uppercase' },
    settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    settingItem: { width: '47%', backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8 },
    settingLabel: { fontSize: 9, color: '#64748b', textTransform: 'uppercase' },
    settingValue: { fontSize: 12, fontWeight: 'bold', color: '#1e293b' },

    pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 10 },
    pageBtn: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    pageInfo: { fontSize: 14, color: '#64748b', fontWeight: 'bold' },

    noData: { alignItems: 'center', marginTop: 50 },
    noDataText: { color: '#94a3b8', fontSize: 14, marginTop: 10 }
});
