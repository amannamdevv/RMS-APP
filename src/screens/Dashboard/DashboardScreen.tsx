import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, SafeAreaView, 
  TouchableOpacity, ActivityIndicator, StatusBar 
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../../App';
import { api } from '../../api';
import { logoutApi } from '../../api/auth';
import Icon from 'react-native-vector-icons/Feather';
import Sidebar from '../../components/Sidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation, route }: Props) {
  const [healthKpi, setHealthKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [fullname, setFullname] = useState('Administrator');

  useEffect(() => {
    const loadName = async () => {
      try {
        const storedName = await AsyncStorage.getItem('user_fullname');
        if (storedName) setFullname(storedName);
      } catch (error) {
        console.log('Error loading fullname', error);
      }
    };
    loadName();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const healthRes = await api.getSiteHealth({ status: 'all' }, 1, 1);
      if (healthRes.status === 'success') {
        setHealthKpi(healthRes.counts);
      }
    } catch (e) {
      console.log('Error fetching dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user_fullname');
    await logoutApi();
    navigation.replace('Login');
  };

  const renderMiniKPI = (label: string, value: any, color: string) => (
    <View style={styles.miniKpi}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, { color }]}>{value || 0}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3c72" />

      {/* HEADER WITH HAMBURGER ICON */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuIcon}>
          <Icon name="menu" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={{ width: 26 }} />
      </View>

      <Sidebar 
        isVisible={isSidebarVisible} 
        onClose={() => setSidebarVisible(false)} 
        navigation={navigation} 
        fullname={fullname}
        handleLogout={handleLogout}
        activeRoute="Dashboard" // <-- TRACKING DASHBOARD HERE
      />

      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionTitle}>Analytics Modules</Text>

        <TouchableOpacity 
          style={styles.mainCard} 
          activeOpacity={0.8} 
          onPress={() => navigation.navigate('SiteHealth')}
        >
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.iconContainer, { backgroundColor: '#10b98115' }]}>
                <Icon name="heart" size={24} color="#10b981" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.cardTitle}>Site Health Details</Text>
                <Text style={styles.cardSubtitle}>Up, Down, Non-Comm</Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </View>

          <View style={styles.kpiDivider} />

          {loading ? (
            <ActivityIndicator size="small" color="#1e3c72" style={{ marginVertical: 10 }} />
          ) : (
            <View style={styles.statsRow}>
              {renderMiniKPI('Total', healthKpi?.total, '#1e3c72')}
              {renderMiniKPI('Up', healthKpi?.up, '#10b981')}
              {renderMiniKPI('Down', healthKpi?.down, '#ef4444')}
              {renderMiniKPI('Offline', healthKpi?.non_comm, '#f59e0b')}
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: '#1e3c72', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuIcon: { paddingRight: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16, marginTop: 4 }, 

  mainCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e3c72', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#8a8fa8' },
  arrowIcon: { fontSize: 20, color: '#1e3c72', fontWeight: 'bold' },
  
  kpiDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  miniKpi: { alignItems: 'center', flex: 1 },
  miniLabel: { fontSize: 11, color: '#888', fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase' },
  miniValue: { fontSize: 20, fontWeight: '800' }
});