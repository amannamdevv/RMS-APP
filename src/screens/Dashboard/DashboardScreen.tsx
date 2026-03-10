import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import Icon from 'react-native-vector-icons/Feather';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  
  const DashboardCard = ({ title, subtitle, icon, color, route }: any) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => navigation.navigate(route)}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Icon name={icon} size={28} color={color} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          <DashboardCard title="Site Health" subtitle="Up, Down, Non-Comm" icon="heart" color="#10b981" route="SiteHealth" />
          <DashboardCard title="Site Vitals" subtitle="Voltage Analytics" icon="activity" color="#3b82f6" route="SiteHealth" />
          <DashboardCard title="Open Alarms" subtitle="Severity Analysis" icon="alert-circle" color="#ef4444" route="Alarms" />
          <DashboardCard title="Battery Health" subtitle="Good, Avg, Bad" icon="battery-charging" color="#f59e0b" route="SiteHealth" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: '#1e3c72', padding: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 16 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { backgroundColor: '#fff', width: '48%', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3, alignItems: 'center' },
  iconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e3c72', textAlign: 'center', marginBottom: 4 },
  cardSubtitle: { fontSize: 11, color: '#888', textAlign: 'center' }
});