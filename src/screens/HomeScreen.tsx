import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {logoutApi} from '../api/auth';

type Props = {
  fullname: string;
  onLogout: () => void;
};

export default function HomeScreen({fullname, onLogout}: Props) {
  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (_) {
      // ignore errors on logout
    } finally {
      onLogout();
    }
  };

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.gradient}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0c29" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>RMS</Text>
            </View>
            <Text style={styles.headerTitle}>Remote Management System</Text>
          </View>

          {/* Welcome Card */}
          <View style={styles.card}>
            <Text style={styles.greeting}>Welcome back! 👋</Text>
            <Text style={styles.name}>{fullname}</Text>
            <Text style={styles.desc}>
              You are successfully logged in to the RMS Mobile App.{'\n'}
              Full dashboard features are coming soon.
            </Text>
          </View>

          {/* Logout */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.85}>
            <LinearGradient
              colors={['#ef4444', '#b91c1c']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.logoutGradient}>
              <Text style={styles.logoutText}>🚪  Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  gradient: {flex: 1},
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {alignItems: 'center', marginBottom: 40},
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderWidth: 2,
    borderColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {fontSize: 22, fontWeight: '900', color: '#667eea', letterSpacing: 2},
  headerTitle: {fontSize: 18, fontWeight: '700', color: '#fff'},
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {fontSize: 16, color: '#8a8fa8', marginBottom: 8},
  name: {fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 16, textAlign: 'center'},
  desc: {fontSize: 14, color: '#8a8fa8', textAlign: 'center', lineHeight: 22},
  logoutBtn: {borderRadius: 14, overflow: 'hidden'},
  logoutGradient: {height: 52, justifyContent: 'center', alignItems: 'center'},
  logoutText: {color: '#fff', fontSize: 16, fontWeight: '700'},
});
