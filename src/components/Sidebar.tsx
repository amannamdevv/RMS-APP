import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Animated, Dimensions, TouchableWithoutFeedback, Modal, SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
  navigation: any;
  fullname: string;
  handleLogout: () => void;
}

export default function Sidebar({ isVisible, onClose, navigation, fullname, handleLogout }: SidebarProps) {
  const [expandedMenu, setExpandedMenu] = useState<string | null>('Live Sites Status');
  const slideAnim = React.useRef(new Animated.Value(-width * 0.75)).current;

  React.useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: -width * 0.75, duration: 300, useNativeDriver: true }).start();
    }
  }, [isVisible]);

  const toggleAccordion = (menuName: string) => {
    setExpandedMenu(expandedMenu === menuName ? null : menuName);
  };

  const navigateTo = (route: string) => {
    onClose();
    setTimeout(() => navigation.navigate(route), 300);
  };

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.background} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Profile Section instead of STPL RMS */}
            <View style={styles.profileSection}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{fullname.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.profileName}>{fullname}</Text>
                <Text style={styles.profileRole}>Administrator</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{marginLeft: 'auto'}}>
                 <Icon name="x" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll}>
              <TouchableOpacity style={styles.item} onPress={() => navigateTo('Home')}>
                <Icon name="home" size={20} color="#61A5C2" style={styles.icon}/>
                <Text style={[styles.text, {color: '#61A5C2'}]}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.item} onPress={() => navigateTo('Dashboard')}>
                <Icon name="grid" size={20} color="#fff" style={styles.icon}/>
                <Text style={styles.text}>Dashboard</Text>
            </TouchableOpacity>
              <TouchableOpacity style={styles.accordion} onPress={() => toggleAccordion('Live Sites Status')}>
                <View style={styles.row}><Icon name="activity" size={20} color="#fff" style={styles.icon}/><Text style={styles.text}>Live Sites Status</Text></View>
                <Icon name={expandedMenu === 'Live Sites Status' ? "chevron-up" : "chevron-down"} size={18} color="#fff" />
              </TouchableOpacity>
              
              {expandedMenu === 'Live Sites Status' && (
                <View style={styles.subMenu}>
                  {['Critical Sites', 'Sites at Risk', 'Operational Sites'].map(item => (
                    <TouchableOpacity key={item} style={styles.subItem}><Text style={styles.subText}>{item}</Text></TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.subItem} onPress={() => navigateTo('NonCommSites')}><Text style={styles.subText}>Non-Communicating</Text></TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.item} onPress={() => navigateTo('SiteHealth')}>
                <Icon name="heart" size={20} color="#fff" style={styles.icon}/>
                <Text style={styles.text}>Site Health Details</Text>
            </TouchableOpacity>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Icon name="log-out" size={18} color="#fff" style={styles.icon}/>
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
  background: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawerContainer: { width: width * 0.75, height: '100%', backgroundColor: '#0f203c' },
  profileSection: { padding: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e3c72', backgroundColor: '#162b4d' },
  avatarCircle: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#61A5C2', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  profileName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  profileRole: { color: '#89C2D9', fontSize: 12 },
  scroll: { flex: 1, paddingVertical: 10 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingHorizontal: 20 },
  accordion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 15 },
  text: { color: '#fff', fontSize: 15 },
  subMenu: { backgroundColor: '#0a1629' },
  subItem: { padding: 12, paddingLeft: 50 },
  subText: { color: '#89C2D9', fontSize: 14 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#1e3c72' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc2626', padding: 12, borderRadius: 8, justifyContent: 'center' },
  logoutText: { color: '#fff', fontWeight: 'bold' }
});