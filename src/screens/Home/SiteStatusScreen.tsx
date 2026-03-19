import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, RefreshControl,
  StatusBar, TextInput, Alert
} from 'react-native';
import { api } from '../../api';
import Icon from 'react-native-vector-icons/Feather';
import Sidebar from '../../components/Sidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logoutApi } from '../../api/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

// --- CSV Helper Function ---
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
      }
    } catch (e) {
      console.log("Master Report Fetch Error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExport = async () => {
    if (listData.length === 0) {
      Alert.alert("No Data", "Please search for data first before exporting.");
      return;
    }
    try {
      setLoading(true);
      const params = {
        date: date.toISOString().split('T')[0],
        site_name: siteName,
        site_id: siteId,
        global_id: globalId,
        imei: imei,
        page_size: 5000,
      };
      const res = await api.getMasterReport(params, 1);
      const dataToExport = res.results;

      const csvString = convertToCSV(dataToExport);
      const fileName = `Master_Report_${new Date().getTime()}.csv`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, csvString, 'utf8');
      await Share.open({
        title: 'Export Master Report',
        url: `file://${filePath}`,
        type: 'text/csv',
        filename: fileName,
      });
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        Alert.alert("Error", "Could not generate file.");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3c72" />

      {/* MATCHED HEADER FROM SITE STATUS */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Master Report</Text>

        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleExport}>
            <Icon name="download" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSidebarVisible(true)}>
            <Icon name="menu" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchReportData(1)} />}>

        {/* MATCHED KPI SECTION FROM SITE STATUS */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{totalRecords}</Text>
            <Text style={styles.kpiLabel}>Total Records</Text>
          </View>
          <TouchableOpacity style={styles.kpiCard} onPress={() => setShowDatePicker(true)}>
            <Text style={[styles.kpiValue, { fontSize: 14 }]}>{date.toISOString().split('T')[0]}</Text>
            <Text style={styles.kpiLabel}>Selected Date</Text>
          </TouchableOpacity>
        </View>

        {/* FILTERS SECTION */}
        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabel}>Site Name</Text>
              <TextInput style={styles.input} placeholder="Site Name" placeholderTextColor="#000" value={siteName} onChangeText={setSiteName} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabel}>Site ID</Text>
              <TextInput style={styles.input} placeholder="Site ID" placeholderTextColor="#000" value={siteId} onChangeText={setSiteId} />
            </View>
          </View>
          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabel}>Global ID</Text>
              <TextInput style={styles.input} placeholder="Global ID" placeholderTextColor="#000" value={globalId} onChangeText={setGlobalId} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabel}>IMEI</Text>
              <TextInput style={styles.input} placeholder="Enter IMEI" placeholderTextColor="#000" value={imei} onChangeText={setImei} />
            </View>
          </View>
          <TouchableOpacity style={styles.applyBtn} onPress={() => fetchReportData(1)} activeOpacity={0.8}>
            <Text style={styles.applyBtnText}>Search Report →</Text>
          </TouchableOpacity>
        </View>

        {/* LIST DATA */}
        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator color="#1e3c72" size="large" style={{ marginTop: 30 }} />
          ) : (
            listData.map((item, index) => {
              const isExpanded = expandedIds.includes(`${item.imei}-${index}`);
              return (
                <View key={index} style={styles.reportCard}>
                  <TouchableOpacity onPress={() => toggleExpand(`${item.imei}-${index}`)} activeOpacity={0.9}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.siteNameText}>{item.site_name}</Text>
                      <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#1e3c72" />
                    </View>
                    <Text style={styles.siteSubText}>ID: {item.site_id} | {item.imei}</Text>

                    <View style={styles.basicInfoRow}>
                      <Text style={styles.infoText}>Mains: <Text style={styles.boldText}>{item.mains_r}/{item.mains_y}</Text></Text>
                      <Text style={styles.infoText}>Batt: <Text style={[styles.boldText, { color: '#2ecc71' }]}>{item.bts_volt}V</Text></Text>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.divider} />
                      <Text style={styles.detailText}>Alarms: {item.active_alarms || 'None'}</Text>
                      <Text style={styles.detailText}>Mains Duration: {item.mains_duration}</Text>
                      <Text style={styles.detailText}>DG Duration: {item.dg_duration}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity disabled={currentPage === 1} onPress={() => fetchReportData(currentPage - 1)} style={styles.pageBtn}><Icon name="chevron-left" size={20} color="#1e3c72" /></TouchableOpacity>
            <Text style={styles.pageInfo}>{currentPage} / {totalPages}</Text>
            <TouchableOpacity disabled={currentPage === totalPages} onPress={() => fetchReportData(currentPage + 1)} style={styles.pageBtn}><Icon name="chevron-right" size={20} color="#1e3c72" /></TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Sidebar isVisible={isSidebarVisible} onClose={() => setSidebarVisible(false)} navigation={navigation} fullname={fullname} activeRoute="MasterReport" handleLogout={async () => { await logoutApi(); navigation.replace('Login'); }} />
      {showDatePicker && <DateTimePicker value={date} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if (d) setDate(d); }} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c5d4eeff' },
  header: { padding: 16, backgroundColor: '#1e3c72', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 4 },
  backButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, marginLeft: 10 },

  kpiContainer: { flexDirection: 'row', padding: 16, gap: 10 },
  kpiCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
  kpiValue: { fontSize: 22, fontWeight: '700', color: '#1e3c72' },
  kpiLabel: { fontSize: 11, color: '#666', marginTop: 4 },

  filterSection: { backgroundColor: '#fff', padding: 15, marginHorizontal: 16, borderRadius: 12, elevation: 2 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  filterLabel: { fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 3, textTransform: 'uppercase' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 8, borderRadius: 8, color: '#000', fontSize: 13 },
  applyBtn: { backgroundColor: '#1e3c72', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  applyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  listContainer: { padding: 16 },
  reportCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  siteNameText: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  siteSubText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  basicInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  infoText: { fontSize: 12, color: '#475569' },
  boldText: { fontWeight: 'bold', color: '#1e293b' },
  expandedContent: { marginTop: 12, paddingTop: 12 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 10 },
  detailText: { fontSize: 12, color: '#475569', marginBottom: 5 },

  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingBottom: 30 },
  pageBtn: { width: 36, height: 36, backgroundColor: '#fff', borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  pageInfo: { fontSize: 13, fontWeight: 'bold', color: '#64748b' }
});