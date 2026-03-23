/**
 * EnergyRunHoursScreen.tsx
 *
 * API: GET /api/energy/run-hours/
 * Params: date_from, date_to, state_id, district_id, cluster_id, energy_type, site_id, etc.
 *
 * Response:
 * {
 *   status, total_active_sites, is_single_day, from_date, to_date,
 *   summary: { avg_eb, avg_dg, avg_bb, total_sites },
 *   eb_categories:         [{ name, count, color, percentage }],
 *   battery_categories:    [{ name, count, color, percentage }],
 *   dg_categories:         [{ name, count, color, percentage }],
 *   mains_fail_categories: [{ name, count, color, percentage }]
 * }
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, SafeAreaView, Dimensions, RefreshControl,
    StatusBar, Modal, TextInput, Alert, Share,
} from 'react-native';
import { api } from '../api';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import Sidebar from '../components/Sidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import RNShare from 'react-native-share';

const { width: SW } = Dimensions.get('window');

// ─── Helpers ─────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split('T')[0]; }
function daysAgoStr(n: number) {
    const d = new Date(); d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
}
function yesterdayStr() { return daysAgoStr(1); }

// ─── Mini horizontal bar ──────────────────────────────────────
function HBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <View style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginTop: 4 }}>
            <View style={{ height: 6, width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
        </View>
    );
}

// ─── Category Card ────────────────────────────────────────────
function CategoryCard({ cat, maxCount, onPress }: {
    cat: any; maxCount: number; onPress: () => void;
}) {
    const color = cat.color || '#3b82f6';
    return (
        <TouchableOpacity
            style={[CCS.card, { borderLeftColor: color }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={CCS.row}>
                <Text style={CCS.name} numberOfLines={2}>{cat.name}</Text>
                <Text style={[CCS.count, { color }]}>{cat.count}</Text>
            </View>
            {cat.percentage != null && (
                <Text style={CCS.pct}>{cat.percentage}% of total sites</Text>
            )}
            <HBar value={cat.count} max={maxCount} color={color} />
        </TouchableOpacity>
    );
}
const CCS = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4, elevation: 2, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    name: { fontSize: 12, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 8 },
    count: { fontSize: 22, fontWeight: '800' },
    pct: { fontSize: 10, color: '#64748b', marginBottom: 4 },
});

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
    return (
        <View style={[KCS.card, { borderLeftColor: color }]}>
            <View style={[KCS.iconBox, { backgroundColor: `${color}18` }]}>
                <Icon name={icon} size={18} color={color} />
            </View>
            <Text style={[KCS.val, { color }]}>{value}</Text>
            <Text style={KCS.lab}>{label}</Text>
        </View>
    );
}
const KCS = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flex: 1, borderLeftWidth: 3, elevation: 2, alignItems: 'center', marginHorizontal: 4 },
    iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    val: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    lab: { fontSize: 9, color: '#64748b', fontWeight: '700', textAlign: 'center' },
});

// ─── Section wrapper ──────────────────────────────────────────
function Section({ title, icon, iconColor, children }: {
    title: string; icon: string; iconColor: string; children: React.ReactNode;
}) {
    return (
        <View style={SEC.wrap}>
            <View style={SEC.header}>
                <Icon name={icon} size={16} color={iconColor} />
                <Text style={SEC.title}>{title}</Text>
            </View>
            {children}
        </View>
    );
}
const SEC = StyleSheet.create({
    wrap: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    title: { fontSize: 13, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ─── Date quick buttons ───────────────────────────────────────
const DATE_PRESETS = [
    { label: 'Yesterday', from: yesterdayStr(), to: yesterdayStr() },
    { label: 'Today', from: todayStr(), to: todayStr() },
    { label: 'Week', from: daysAgoStr(7), to: todayStr() },
    { label: 'Month', from: daysAgoStr(30), to: todayStr() },
];

// ─── Filter Drawer ────────────────────────────────────────────
function FilterDrawer({ visible, onClose, filters, setFilters, onApply }: any) {
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={FD.overlay}>
                <View style={FD.drawer}>
                    <View style={FD.header}>
                        <Text style={FD.title}>Filters</Text>
                        <TouchableOpacity onPress={onClose}><Icon name="x" size={22} color="#1e293b" /></TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                        {/* Date From */}
                        <Text style={FD.label}>DATE FROM</Text>
                        <TextInput style={FD.input} value={filters.date_from}
                            onChangeText={v => setFilters((f: any) => ({ ...f, date_from: v }))}
                            placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" />

                        {/* Date To */}
                        <Text style={FD.label}>DATE TO</Text>
                        <TextInput style={FD.input} value={filters.date_to}
                            onChangeText={v => setFilters((f: any) => ({ ...f, date_to: v }))}
                            placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" />

                        {/* Quick presets */}
                        <Text style={FD.label}>QUICK SELECT</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                            {DATE_PRESETS.map(p => (
                                <TouchableOpacity key={p.label}
                                    style={[FD.preset, filters.date_from === p.from && filters.date_to === p.to && FD.presetActive]}
                                    onPress={() => setFilters((f: any) => ({ ...f, date_from: p.from, date_to: p.to }))}
                                >
                                    <Text style={[FD.presetTxt, filters.date_from === p.from && filters.date_to === p.to && FD.presetTxtActive]}>
                                        {p.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Energy type */}
                        <Text style={FD.label}>ENERGY TYPE</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            {['', 'eb', 'battery', 'dg'].map(t => (
                                <TouchableOpacity key={t}
                                    style={[FD.preset, filters.energy_type === t && FD.presetActive]}
                                    onPress={() => setFilters((f: any) => ({ ...f, energy_type: t }))}
                                >
                                    <Text style={[FD.presetTxt, filters.energy_type === t && FD.presetTxtActive]}>
                                        {t || 'All'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={FD.applyBtn} onPress={() => { onApply(); onClose(); }} activeOpacity={0.8}>
                            <Icon name="filter" size={14} color="#fff" />
                            <Text style={FD.applyTxt}>Apply Filters</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={FD.resetBtn}
                            onPress={() => setFilters({ date_from: yesterdayStr(), date_to: yesterdayStr(), energy_type: '' })}>
                            <Text style={FD.resetTxt}>Reset to Yesterday</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
const FD = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    drawer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
    label: { fontSize: 9, fontWeight: '800', color: '#01497c', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
    input: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, color: '#0f172a', fontWeight: '600', borderWidth: 1.5, borderColor: '#d0e4f7', marginBottom: 4 },
    preset: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#d0e4f7' },
    presetActive: { backgroundColor: '#01497c', borderColor: '#01497c' },
    presetTxt: { fontSize: 11, fontWeight: '700', color: '#64748b' },
    presetTxtActive: { color: '#fff' },
    applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#01497c', borderRadius: 12, paddingVertical: 14, marginBottom: 10 },
    applyTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
    resetBtn: { alignItems: 'center', paddingVertical: 10 },
    resetTxt: { color: '#01497c', fontWeight: '700', fontSize: 13 },
});

// ─── MAIN ─────────────────────────────────────────────────────
export default function EnergyRunHoursScreen({ navigation }: any) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterVisible, setFilterVisible] = useState(false);
    const [activeSection, setActiveSection] = useState<'all' | 'eb' | 'battery' | 'dg'>('all');
    const [isSidebarVisible, setSidebarVisible] = useState(false);
    const [fullname, setFullname] = useState('Administrator');

    const scrollRef = useRef<ScrollView>(null);
    const sectionRefs: Record<string, number> = {};

    const [filters, setFilters] = useState({
        date_from: yesterdayStr(),
        date_to: yesterdayStr(),
        energy_type: '',
    });

    useEffect(() => {
        AsyncStorage.getItem('user_fullname').then(n => { if (n) setFullname(n); });
        fetchData();
    }, []);

    const fetchData = useCallback(async (isRefresh = false, customFilters?: any) => {
        if (!isRefresh) setLoading(true);
        const params = customFilters || filters;
        try {
            const res = await (api as any).getEnergyRunHours(
                Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))
            );
            if (res?.status === 'success') setData(res);
        } catch (e) {
            console.log('Energy run hours error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filters]);

    const onRefresh = () => { setRefreshing(true); fetchData(true); };
    const onApply = () => { setData(null); fetchData(false); };

    // Share/Download summary
    const handleShare = async () => {
        if (!data) return;
        const { summary, from_date, to_date } = data;
        const csvContent = [
            `"ENERGY RUN HOURS REPORT (${from_date}${from_date !== to_date ? ` to ${to_date}` : ''})"`,
            '',
            'KPI,VALUE',
            `"Avg EB Hours","${summary?.avg_eb || 0}h"`,
            `"Avg DG Hours","${summary?.avg_dg || 0}h"`,
            `"Avg Battery Hours","${summary?.avg_bb || 0}h"`,
            `"Total Sites","${summary?.total_sites || 0}"`,
            '',
            'ESTIMATED MONTHLY COST,AMOUNT',
            `"Estimated SEB Bill","₹${Math.round((parseFloat(summary?.avg_eb) || 0) * 30 * 8 * (parseInt(summary?.total_sites) || 0)).toLocaleString('en-IN')}"`,
            `"Estimated Diesel Cost","₹${Math.round((parseFloat(summary?.avg_dg) || 0) * 30 * 3 * 95 * (parseInt(summary?.total_sites) || 0)).toLocaleString('en-IN')}"`,
            `"Total Estimated Cost","₹${(Math.round((parseFloat(summary?.avg_eb) || 0) * 30 * 8 * (parseInt(summary?.total_sites) || 0)) + Math.round((parseFloat(summary?.avg_dg) || 0) * 30 * 3 * 95 * (parseInt(summary?.total_sites) || 0))).toLocaleString('en-IN')}"`,
        ].join('\n');

        const path = `${RNFS.TemporaryDirectoryPath}/energy_run_hours_${from_date}_to_${to_date}_${Date.now()}.csv`;
        
        try {
            await RNFS.writeFile(path, csvContent, 'utf8');
            await RNShare.open({
                url: `file://${path}`,
                type: 'text/csv',
                filename: 'Energy_Run_Hours_Report',
                title: 'Share Energy Report'
            });
        } catch (e: any) {
            console.log('Export error:', e);
            try { await Share.share({ message: csvContent, title: 'Energy Report' }); } catch (err) {}
        }
    };

    const summary = data?.summary || {};
    const ebCategories = data?.eb_categories || [];
    const batteryCategories = data?.battery_categories || [];
    const dgCategories = data?.dg_categories || [];
    const mainsCategories = data?.mains_fail_categories || [];

    const maxEB = Math.max(...ebCategories.map((c: any) => c.count), 1);
    const maxBat = Math.max(...batteryCategories.map((c: any) => c.count), 1);
    const maxDG = Math.max(...dgCategories.map((c: any) => c.count), 1);
    const maxMains = Math.max(...mainsCategories.map((c: any) => c.count), 1);

    const avgEB = parseFloat(summary.avg_eb) || 0;
    const avgDG = parseFloat(summary.avg_dg) || 0;
    const totalS = parseInt(summary.total_sites) || 0;
    const sebCost = Math.round(avgEB * 30 * 8 * totalS);
    const dieselCost = Math.round(avgDG * 30 * 3 * 95 * totalS);
    const totalCost = sebCost + dieselCost;
    const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN');

    const dateLabel = data?.is_single_day
        ? `${data?.from_date}`
        : `${data?.from_date} → ${data?.to_date}`;

    const goToDetails = (category: string) => {
        navigation.navigate('EnergyRunHoursDetails', {
            category,
            date_from: filters.date_from,
            date_to: filters.date_to,
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#012a4a" />

            {/* Header */}
            <LinearGradient colors={['#012a4a', '#01497c']} style={styles.header}>
                <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.hBtn}>
                    <Icon name="menu" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={styles.hTitle}>⚡ ENERGY RUN HOURS</Text>
                    <Text style={styles.hSub}>{data ? dateLabel : 'Loading...'}</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => setFilterVisible(true)} style={styles.hBtn}>
                        <Icon name="sliders" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onRefresh} style={styles.hBtn}>
                        <Icon name="refresh-cw" size={16} color={refreshing ? '#89C2D9' : '#fff'} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Section Filter Tabs */}
            <View style={styles.tabBar}>
                {([
                    { key: 'all', label: `All (${summary.total_sites || '—'})` },
                    { key: 'eb', label: 'EB' },
                    { key: 'battery', label: 'Battery' },
                    { key: 'dg', label: 'DG' },
                ] as const).map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tabBtn, activeSection === t.key && styles.tabBtnActive]}
                        onPress={() => setActiveSection(t.key)}
                    >
                        <Text style={[styles.tabTxt, activeSection === t.key && styles.tabTxtActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loaderBox}>
                    <ActivityIndicator size="large" color="#01497c" />
                    <Text style={styles.loaderTxt}>Loading energy data...</Text>
                </View>
            ) : (
                <ScrollView
                    ref={scrollRef}
                    style={{ flex: 1, backgroundColor: '#c5d4ee' }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#01497c']} />}
                    contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Summary KPI row */}
                    {(activeSection === 'all') && (
                        <View style={{ flexDirection: 'row', marginBottom: 14 }}>
                            <KpiCard icon="zap" label="Avg EB" value={`${summary.avg_eb || 0}h`} color="#01497c" />
                            <KpiCard icon="truck" label="Avg DG" value={`${summary.avg_dg || 0}h`} color="#2a6f97" />
                            <KpiCard icon="battery" label="Avg Battery" value={`${summary.avg_bb || 0}h`} color="#468faf" />
                            <KpiCard icon="map-pin" label="Sites" value={String(summary.total_sites || 0)} color="#89C2D9" />
                        </View>
                    )}

                    {/* EB Section */}
                    {(activeSection === 'all' || activeSection === 'eb') && ebCategories.length > 0 && (
                        <Section title="EB Run Hours Distribution" icon="zap" iconColor="#01497c">
                            {ebCategories
                                .filter((c: any) => !c.name.includes('DG') && !c.name.includes('Zero'))
                                .map((cat: any, i: number) => (
                                    <CategoryCard key={i} cat={cat} maxCount={maxEB}
                                        onPress={() => goToDetails(cat.name)} />
                                ))}
                        </Section>
                    )}

                    {/* Battery Section */}
                    {(activeSection === 'all' || activeSection === 'battery') && batteryCategories.length > 0 && (
                        <Section title="Battery Run Hours Analysis" icon="battery" iconColor="#468faf">
                            {batteryCategories.map((cat: any, i: number) => (
                                <CategoryCard key={i} cat={cat} maxCount={maxBat}
                                    onPress={() => goToDetails(cat.name)} />
                            ))}
                        </Section>
                    )}

                    {/* DG Section */}
                    {(activeSection === 'all' || activeSection === 'dg') && (
                        <>
                            {dgCategories.length > 0 && (
                                <Section title="DG Run Hours" icon="truck" iconColor="#2a6f97">
                                    {dgCategories.map((cat: any, i: number) => (
                                        <CategoryCard key={i} cat={cat} maxCount={maxDG}
                                            onPress={() => goToDetails(cat.name)} />
                                    ))}
                                    {/* Zero DG from eb_categories */}
                                    {ebCategories
                                        .filter((c: any) => c.name.includes('Zero DG'))
                                        .map((cat: any, i: number) => (
                                            <CategoryCard key={`zdg_${i}`} cat={cat} maxCount={maxDG}
                                                onPress={() => goToDetails(cat.name)} />
                                        ))}
                                </Section>
                            )}

                            {mainsCategories.length > 0 && (
                                <Section title="Mains Failure Duration" icon="alert-triangle" iconColor="#012a4a">
                                    {mainsCategories.map((cat: any, i: number) => (
                                        <CategoryCard key={i} cat={cat} maxCount={maxMains}
                                            onPress={() => goToDetails(cat.name)} />
                                    ))}
                                </Section>
                            )}
                        </>
                    )}

                    {/* Cost Estimation */}
                    {activeSection === 'all' && (
                        <View style={styles.costCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <Text style={styles.costTitle}>💰 Monthly Cost Estimation</Text>
                            </View>
                            <View style={styles.costRow}>
                                <View style={styles.costItem}>
                                    <Text style={styles.costVal}>{fmtINR(sebCost)}</Text>
                                    <Text style={styles.costLab}>Estimated SEB Bill</Text>
                                </View>
                                <View style={styles.costItem}>
                                    <Text style={styles.costVal}>{fmtINR(dieselCost)}</Text>
                                    <Text style={styles.costLab}>Estimated Diesel Cost</Text>
                                </View>
                                <View style={styles.costItem}>
                                    <Text style={[styles.costVal, { fontSize: 16 }]}>{fmtINR(totalCost)}</Text>
                                    <Text style={styles.costLab}>Total Estimated Cost</Text>
                                </View>
                            </View>
                            <Text style={styles.costNote}>
                                *Based on ₹8/kWh EB rate, ₹95/ltr diesel, 3L/hr DG consumption
                            </Text>
                        </View>
                    )}

                    {/* No data */}
                    {!data && (
                        <View style={styles.emptyBox}>
                            <Icon name="zap-off" size={40} color="#cbd5e1" />
                            <Text style={styles.emptyTxt}>No data available</Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
                                <Text style={styles.retryTxt}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Filter Drawer */}
            <FilterDrawer
                visible={filterVisible}
                onClose={() => setFilterVisible(false)}
                filters={filters}
                setFilters={setFilters}
                onApply={onApply}
            />

            <Sidebar
                isVisible={isSidebarVisible}
                onClose={() => setSidebarVisible(false)}
                navigation={navigation}
                fullname={fullname}
                activeRoute="EnergyRunHours"
                handleLogout={async () => {
                    await AsyncStorage.multiRemove(['userToken', 'djangoSession', 'user_id', 'role']);
                    navigation.replace('Login');
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#c5d4ee' },
    loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderTxt: { marginTop: 12, color: '#01497c', fontWeight: '600', fontSize: 13 },
    header: { paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
    hBtn: { padding: 5 },
    hTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
    hSub: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '600', marginTop: 2 },
    tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 11 },
    tabBtnActive: { borderBottomWidth: 3, borderBottomColor: '#01497c' },
    tabTxt: { fontSize: 11, fontWeight: '700', color: '#64748b' },
    tabTxtActive: { color: '#01497c' },
    costCard: { backgroundColor: '#01497c', borderRadius: 16, padding: 16, marginBottom: 14 },
    costTitle: { fontSize: 14, fontWeight: '800', color: '#fff', flex: 1 },
    costRow: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: 10 },
    costItem: { alignItems: 'center', minWidth: (SW - 60) / 3 },
    costVal: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
    costLab: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textAlign: 'center' },
    costNote: { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 10, textAlign: 'center' },
    downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    downloadTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
    emptyTxt: { color: '#94a3b8', fontSize: 14, marginTop: 12, fontWeight: '500' },
    retryBtn: { marginTop: 16, backgroundColor: '#01497c', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
    retryTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
});