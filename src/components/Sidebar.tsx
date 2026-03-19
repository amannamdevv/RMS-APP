import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, TouchableWithoutFeedback, Modal, SafeAreaView, Easing
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
  navigation: any;
  fullname: string;
  handleLogout: () => void;
  activeRoute?: string;
}

export default function Sidebar({ isVisible, onClose, navigation, fullname, handleLogout, activeRoute }: SidebarProps) {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const slideAnim = React.useRef(new Animated.Value(-width * 0.75)).current;

  // Sub-routes tracking for auto-open dropdowns
  const isSitesSubActive = ['SiteVitals', 'NonCommSites'].includes(activeRoute || '');
  const isAlarmsSubActive = ['LiveAlarms'].includes(activeRoute || '');
  const isUptimeSubActive = ['UptimeDashboard', 'UptimeSiteDetails'].includes(activeRoute || '');

  useEffect(() => {
    if (isSitesSubActive) {
      setExpandedMenu('Live Sites Status');
    } else if (isAlarmsSubActive) {
      setExpandedMenu('Alarms Management');
    } else if (isUptimeSubActive) {
      setExpandedMenu('Uptime & SLA Analytics');
    }
  }, [activeRoute]);

  useEffect(() => {
    if (isVisible) {
      // Auto-expand default menu if none expanded
      if (!expandedMenu && !isSitesSubActive && !isAlarmsSubActive && !isUptimeSubActive) {
        setExpandedMenu('Live Sites Status');
      }

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150, // Ultra-snappy
        useNativeDriver: true,
        easing: Easing.out(Easing.quad)
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width * 0.75,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.in(Easing.quad)
      }).start();
    }
  }, [isVisible]);

  const toggleAccordion = (menuName: string) => {
    setExpandedMenu(expandedMenu === menuName ? null : menuName);
  };

  const navigateTo = (route: string, params?: any) => {
    onClose();
    // Snappy delay for transition
    setTimeout(() => navigation.navigate(route, params), 150);
  };

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.background} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
          <SafeAreaView style={{ flex: 1 }}>

            {/* Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{fullname ? fullname.charAt(0).toUpperCase() : 'A'}</Text>
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.profileName} numberOfLines={1}>{fullname}</Text>
                <Text style={styles.profileRole}>Administrator</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
                <Icon name="x" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

              {/* HOME */}
              <TouchableOpacity
                style={[styles.item, activeRoute === 'Home' && styles.itemActive]}
                onPress={() => navigateTo('Home')}
              >
                <Icon name="home" size={20} color={activeRoute === 'Home' ? "#61A5C2" : "#fff"} style={styles.icon} />
                <Text style={[styles.text, activeRoute === 'Home' && { color: '#61A5C2' }]}>Home</Text>
              </TouchableOpacity>

              {/* DASHBOARD */}
              <TouchableOpacity
                style={[styles.item, activeRoute === 'Dashboard' && styles.itemActive]}
                onPress={() => navigateTo('Dashboard')}
              >
                <Icon name="grid" size={20} color={activeRoute === 'Dashboard' ? "#61A5C2" : "#fff"} style={styles.icon} />
                <Text style={[styles.text, activeRoute === 'Dashboard' && { color: '#61A5C2' }]}>Dashboard</Text>
              </TouchableOpacity>

              {/* LIVE SITES STATUS DROP-DOWN */}
              <TouchableOpacity style={styles.accordion} onPress={() => toggleAccordion('Live Sites Status')} activeOpacity={0.7}>
                <View style={styles.row}>
                  <Icon name="activity" size={20} color={(isSitesSubActive || expandedMenu === 'Live Sites Status') ? "#61A5C2" : "#fff"} style={styles.icon} />
                  <Text style={[styles.text, (isSitesSubActive || expandedMenu === 'Live Sites Status') && { color: '#61A5C2' }]}>Live Sites Status</Text>
                </View>
                <Icon name={expandedMenu === 'Live Sites Status' ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
              </TouchableOpacity>

              {expandedMenu === 'Live Sites Status' && (
                <View style={styles.subMenu}>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('SiteVitals', { range: 'critical' })}>
                    <Text style={styles.subText}>• Critical Sites</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('SiteVitals', { range: 'low' })}>
                    <Text style={styles.subText}>• Sites at Risk</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('SiteVitals', { range: 'normal' })}>
                    <Text style={styles.subText}>• Operational Sites</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('SiteVitals', { range: 'noncomm' })}>
                    <Text style={styles.subText}>• Non-Communicating</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ALARMS MANAGEMENT DROP-DOWN */}
              <TouchableOpacity style={styles.accordion} onPress={() => toggleAccordion('Alarms Management')} activeOpacity={0.7}>
                <View style={styles.row}>
                  <Icon name="bell" size={20} color={(isAlarmsSubActive || expandedMenu === 'Alarms Management') ? "#61A5C2" : "#fff"} style={styles.icon} />
                  <Text style={[styles.text, (isAlarmsSubActive || expandedMenu === 'Alarms Management') && { color: '#61A5C2' }]}>Alarms Management</Text>
                </View>
                <Icon name={expandedMenu === 'Alarms Management' ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
              </TouchableOpacity>

              {expandedMenu === 'Alarms Management' && (
                <View style={styles.subMenu}>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('LiveAlarms', { severity: 'Fire' })}>
                    <Text style={styles.subText}>• Fire & Smoke</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('LiveAlarms', { severity: 'Major' })}>
                    <Text style={styles.subText}>• Major Alarms</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('LiveAlarms', { severity: 'Minor' })}>
                    <Text style={styles.subText}>• Minor Alarms</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* UPTIME & SLA ANALYTICS DROP-DOWN (NEW) */}
              <TouchableOpacity style={styles.accordion} onPress={() => toggleAccordion('Uptime & SLA Analytics')} activeOpacity={0.7}>
                <View style={styles.row}>
                  <Icon name="trending-up" size={20} color={(isUptimeSubActive || expandedMenu === 'Uptime & SLA Analytics') ? "#61A5C2" : "#fff"} style={styles.icon} />
                  <Text style={[styles.text, (isUptimeSubActive || expandedMenu === 'Uptime & SLA Analytics') && { color: '#61A5C2' }]}>Uptime & SLA Analytics</Text>
                </View>
                <Icon name={expandedMenu === 'Uptime & SLA Analytics' ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
              </TouchableOpacity>

              {expandedMenu === 'Uptime & SLA Analytics' && (
                <View style={styles.subMenu}>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('UptimeDashboard', { tab: 'circle' })}>
                    <Text style={[styles.subText, activeRoute === 'UptimeDashboard' && styles.activeSubText]}>• Circle-wise Uptime</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('UptimeDashboard', { tab: 'opco' })}>
                    <Text style={[styles.subText, activeRoute === 'UptimeDashboard' && styles.activeSubText]}>• OPCO-wise Analysis</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('UptimeDashboard', { tab: 'attribute' })}>
                    <Text style={[styles.subText, activeRoute === 'UptimeDashboard' && styles.activeSubText]}>• Attribute Analysis</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('UptimeDashboard', { tab: 'repeat' })}>
                    <Text style={[styles.subText, activeRoute === 'UptimeDashboard' && styles.activeSubText]}>• Repeat Outages</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('UptimeDashboard', { tab: 'seasonal' })}>
                    <Text style={[styles.subText, activeRoute === 'UptimeDashboard' && styles.activeSubText]}>• Seasonal Preparedness</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('UptimeDashboard', { tab: 'monthly' })}>
                    <Text style={[styles.subText, activeRoute === 'UptimeDashboard' && styles.activeSubText]}>• Monthly History</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('UptimeDashboard', { tab: 'quarterly' })}>
                    <Text style={[styles.subText, activeRoute === 'UptimeDashboard' && styles.activeSubText]}>• Quarterly History</Text>
                  </TouchableOpacity>
                </View>
              )}



              {/* COMM REPORT */}
              <TouchableOpacity
                style={[styles.item, activeRoute === 'CommReport' && styles.itemActive]}
                onPress={() => navigateTo('CommReport')}
                activeOpacity={0.7}
              >
                <Icon name="file-text" size={20} color={activeRoute === 'CommReport' ? "#61A5C2" : "#fff"} style={styles.icon} />
                <Text style={[styles.text, activeRoute === 'CommReport' && { color: '#61A5C2' }]}>Comm Report</Text>
              </TouchableOpacity>

              {/* MASTER REPORT */}
              <TouchableOpacity
                style={[styles.item, activeRoute === 'MasterReport' && styles.itemActive]}
                onPress={() => navigateTo('MasterReport')}
                activeOpacity={0.7}
              >
                <Icon name="database" size={20} color={activeRoute === 'MasterReport' ? "#61A5C2" : "#fff"} style={styles.icon} />
                <Text style={[styles.text, activeRoute === 'MasterReport' && { color: '#61A5C2' }]}>Master Report</Text>
              </TouchableOpacity>

            </ScrollView>

            {/* Logout Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                <Icon name="log-out" size={18} color="#fff" style={styles.icon} />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  background: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.75,
    backgroundColor: '#0f203c',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    zIndex: 9999
  },
  profileSection: { padding: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e3c72', backgroundColor: '#162b4d' },
  avatarCircle: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#61A5C2', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  profileName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  profileRole: { color: '#89C2D9', fontSize: 12 },
  scroll: { flex: 1, paddingVertical: 10 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingHorizontal: 20 },
  itemActive: { backgroundColor: '#1e3c72', borderLeftWidth: 4, borderLeftColor: '#61A5C2' },
  accordion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 15 },
  text: { color: '#fff', fontSize: 15, fontWeight: '500' },
  subMenu: { backgroundColor: '#0a1629', paddingBottom: 10 },
  subItem: { padding: 10, paddingLeft: 55 },
  subText: { color: '#89C2D9', fontSize: 13 },
  activeSubText: { color: '#fff', fontWeight: 'bold' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#1e3c72', paddingBottom: 30 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(220, 38, 38, 0.2)', padding: 12, borderRadius: 8, justifyContent: 'center' },
  logoutText: { color: '#fca5a5', fontSize: 16, fontWeight: 'bold' }
});