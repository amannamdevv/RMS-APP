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
  const isAssetSubActive = ['AssetHealth'].includes(activeRoute || '');
  const isDCEMSubActive = ['DCEMAnalytics', 'DCEMMonthlyReport'].includes(activeRoute || '');
  const isEnergySubActive = ['EnergyRunHours', 'EnergyRunHoursDetails'].includes(activeRoute || '');
  const isHistorySubActive = ['SiteLogs', 'HistoricalAlarms'].includes(activeRoute || '');
  const isMaintenanceSubActive = ['TTTool', 'SiteMaintenanceTool'].includes(activeRoute || '');

  useEffect(() => {
    if (isSitesSubActive) {
      setExpandedMenu('Live Sites Status');
    } else if (isAlarmsSubActive) {
      setExpandedMenu('Alarms Management');
    } else if (isUptimeSubActive) {
      setExpandedMenu('Uptime & SLA Analytics');
    } else if (isAssetSubActive) {
      setExpandedMenu('Asset Health');
    } else if (isDCEMSubActive) {
      setExpandedMenu('DCEM Analytics');
    } else if (isEnergySubActive) {
      setExpandedMenu('Energy Management');
    } else if (isHistorySubActive) {
      setExpandedMenu('History Logs');
    } else if (isMaintenanceSubActive) {
      setExpandedMenu('Site Maintenance Tool');
    }
  }, [activeRoute]);

  useEffect(() => {
    if (isVisible) {
      // Only slide open — do NOT auto-expand any menu
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
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

              {/* ENERGY MANAGEMENT */}
              <TouchableOpacity
                style={[styles.item, isEnergySubActive && styles.itemActive]}
                onPress={() => navigateTo('EnergyRunHours')}
              >
                <Icon name="zap" size={20} color={isEnergySubActive ? "#61A5C2" : "#fff"} style={styles.icon} />
                <Text style={[styles.text, isEnergySubActive && { color: '#61A5C2' }]}>Energy Management</Text>
              </TouchableOpacity>

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

              {/* ── DCEM Analytics ── */}
              <TouchableOpacity
                style={[styles.accordion, (isDCEMSubActive || expandedMenu === 'DCEM Analytics') && styles.itemActive]}
                onPress={() => toggleAccordion('DCEM Analytics')}
                activeOpacity={0.7}
              >
                <View style={styles.row}>
                  <Icon name="bar-chart-2" size={20} color={(isDCEMSubActive || expandedMenu === 'DCEM Analytics') ? "#61A5C2" : "#fff"} style={styles.icon} />
                  <Text style={[styles.text, (isDCEMSubActive || expandedMenu === 'DCEM Analytics') && { color: '#61A5C2' }]}>DCEM Analytics</Text>
                </View>
                <Icon name={expandedMenu === 'DCEM Analytics' ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
              </TouchableOpacity>

              {expandedMenu === 'DCEM Analytics' && (
                <View style={styles.subMenu}>
                  {[
                    { name: 'DCEM Overview', route: 'DCEMAnalytics' },
                    { name: 'Monthly Report', route: 'DCEMMonthlyReport' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.route}
                      style={styles.subItem}
                      onPress={() => navigateTo(item.route)}
                    >
                      <Text style={[styles.subText, activeRoute === item.route && styles.activeSubText]}>• {item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.item, activeRoute === 'NocAnalytics' && styles.itemActive]}
                onPress={() => navigateTo('NocAnalytics')}
              >
                <Icon name="pie-chart" size={20} color={activeRoute === 'NocAnalytics' ? "#61A5C2" : "#fff"} style={styles.icon} />
                <Text style={[styles.text, activeRoute === 'NocAnalytics' && { color: '#61A5C2' }]}>NOC Analytics</Text>
              </TouchableOpacity>


              {/* SITE MAINTENANCE TOOL dropdown */}
              <TouchableOpacity
                style={styles.accordion}
                onPress={() => toggleAccordion('Site Maintenance Tool')}
                activeOpacity={0.7}
              >
                <View style={styles.row}>
                  <Icon name="settings" size={20} color={(isMaintenanceSubActive || expandedMenu === 'Site Maintenance Tool') ? "#61A5C2" : "#fff"} style={styles.icon} />
                  <Text style={[styles.text, (isMaintenanceSubActive || expandedMenu === 'Site Maintenance Tool') && { color: '#61A5C2' }]}>Site Maintenance Tool</Text>
                </View>
                <Icon
                  name={expandedMenu === 'Site Maintenance Tool' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#94a3b8"
                />
              </TouchableOpacity>

              {expandedMenu === 'Site Maintenance Tool' && (
                <View style={[styles.subMenu, { backgroundColor: '#0a1629' }]}>
                  <TouchableOpacity style={styles.subItem} onPress={() => { onClose(); navigation.navigate('TTTool', { initialTab: 'equipment' }); }}>
                    <Text style={styles.subText}>• Equipment History Log</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => { onClose(); navigation.navigate('SiteMaintenanceTool', { initialTab: 'infra' }); }}>
                    <Text style={styles.subText}>• Infrastructure Upgrade</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => { onClose(); navigation.navigate('SiteMaintenanceTool', { initialTab: 'smps' }); }}>
                    <Text style={styles.subText}>• SMPS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => { onClose(); navigation.navigate('SiteMaintenanceTool', { initialTab: 'dcem' }); }}>
                    <Text style={styles.subText}>• DCEM Calibration</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => { onClose(); navigation.navigate('TTTool', { initialTab: 'repairs' }); }}>
                    <Text style={styles.subText}>• Major Repairs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subItem} onPress={() => { onClose(); navigation.navigate('TTTool', { initialTab: 'tickets' }); }}>
                    <Text style={styles.subText}>• Raise Ticket & Closure</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* TT Tool (Quick Link) */}
              <TouchableOpacity
                style={[styles.item, activeRoute === 'TTTool' && !isMaintenanceSubActive && styles.itemActive]}
                onPress={() => { onClose(); navigation.navigate('TTTool', { initialTab: 'raise' }); }}
              >
                <Icon name="tool" size={20} color={activeRoute === 'TTTool' ? "#61A5C2" : "#fff"} style={styles.icon} />
                <Text style={[styles.text, activeRoute === 'TTTool' && { color: '#61A5C2' }]}>TT Tool</Text>
              </TouchableOpacity>

              {/* Asset Health Management */}
              <TouchableOpacity
                style={[styles.accordion, (isAssetSubActive || expandedMenu === 'Asset Health') && styles.itemActive]}
                onPress={() => toggleAccordion('Asset Health')}
                activeOpacity={0.7}
              >
                <View style={styles.row}>
                  <Icon name="activity" size={20} color={(isAssetSubActive || expandedMenu === 'Asset Health') ? "#61A5C2" : "#fff"} style={styles.icon} />
                  <Text style={[styles.text, (isAssetSubActive || expandedMenu === 'Asset Health') && { color: '#61A5C2' }]}>Asset Health</Text>
                </View>
                <Icon name={expandedMenu === 'Asset Health' ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
              </TouchableOpacity>

              {expandedMenu === 'Asset Health' && (
                <View style={styles.subMenu}>
                  {[
                    { name: 'Battery', tab: 'battery' },
                    { name: 'DG', tab: 'dg' },
                    { name: 'Rectifier', tab: 'rectifier' },
                    { name: 'Solar', tab: 'solar' },
                    { name: 'DG Battery', tab: 'dg_battery' },
                    { name: 'LA (Lightning)', tab: 'lightning' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.tab}
                      style={styles.subItem}
                      onPress={() => navigateTo('AssetHealth', { tab: item.tab })}
                    >
                      <Text style={[styles.subText, activeRoute === 'AssetHealth' && styles.activeSubText]}>• {item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* COMM REPORT */}
              <TouchableOpacity
                style={[styles.item, activeRoute === 'CommReport' && styles.itemActive]}
                onPress={() => navigateTo('CommReport')}
                activeOpacity={0.7}
              >
                <Icon name="file-text" size={20} color={activeRoute === 'CommReport' ? "#61A5C2" : "#fff"} style={styles.icon} />
                <Text style={[styles.text, activeRoute === 'CommReport' && { color: '#61A5C2' }]}>Amf Smps Last Comm</Text>
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

              {/* Grid Power Analytics */}
              <TouchableOpacity
                style={[styles.item, activeRoute === 'GridBilling' && styles.itemActive]}
                onPress={() => navigateTo('GridBilling')}
              >
                <Icon name="zap" size={20} color={activeRoute === 'GridBilling' ? "#61A5C2" : "#fff"} style={styles.icon} />
                <Text style={[styles.text, activeRoute === 'GridBilling' && { color: '#61A5C2' }]}>Grid Analytics</Text>
              </TouchableOpacity>

              {/* HISTORY LOGS DROP-DOWN */}
              <TouchableOpacity style={styles.accordion} onPress={() => toggleAccordion('History Logs')} activeOpacity={0.7}>
                <View style={styles.row}>
                  <Icon name="clock" size={20} color={(isHistorySubActive || expandedMenu === 'History Logs') ? "#61A5C2" : "#fff"} style={styles.icon} />
                  <Text style={[styles.text, (isHistorySubActive || expandedMenu === 'History Logs') && { color: '#61A5C2' }]}>History Logs</Text>
                </View>
                <Icon name={expandedMenu === 'History Logs' ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
              </TouchableOpacity>

              {expandedMenu === 'History Logs' && (
                <View style={styles.subMenu}>
                  {[
                    { name: 'Site Logs', route: 'SiteLogs' },
                    { name: 'Historical Alarms', route: 'HistoricalAlarms' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.route}
                      style={styles.subItem}
                      onPress={() => navigateTo(item.route)}
                    >
                      <Text style={[styles.subText, activeRoute === item.route && styles.activeSubText]}>• {item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}


              {/* MAPPING OF RESOURCES */}
              <TouchableOpacity
                style={[styles.item, activeRoute === 'ResourceMapping' && styles.itemActive]}
                onPress={() => navigateTo('ResourceMapping')}
                activeOpacity={0.7}
              >
                <Icon name="map" size={20} color={activeRoute === 'ResourceMapping' ? "#61A5C2" : "#fff"} style={styles.icon} />
                <Text style={[styles.text, activeRoute === 'ResourceMapping' && { color: '#61A5C2' }]}>Mapping of Resources</Text>
              </TouchableOpacity>

              {/* SITE VARIATION ANALYSIS */}
              <TouchableOpacity
                style={[styles.item, activeRoute === 'SiteVariation' && styles.itemActive]}
                onPress={() => navigateTo('SiteVariation')}
                activeOpacity={0.7}
              >
                <Icon name="activity" size={20} color={activeRoute === 'SiteVariation' ? "#61A5C2" : "#fff"} style={styles.icon} />
                <Text style={[styles.text, activeRoute === 'SiteVariation' && { color: '#61A5C2' }]}>Site Variation Analysis</Text>
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