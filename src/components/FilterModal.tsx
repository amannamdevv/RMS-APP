import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../api';

const FilterModal = ({ visible, onClose, onApply, initialFilters = {} }) => {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [clusters, setClusters] = useState([]);
  
  const [selectedState, setSelectedState] = useState(initialFilters.state_id || '');
  const [selectedDistrict, setSelectedDistrict] = useState(initialFilters.district_id || '');
  const [selectedCluster, setSelectedCluster] = useState(initialFilters.cluster_id || '');
  
  const [searchType, setSearchType] = useState(initialFilters.search_type || '');
  const [siteId, setSiteId] = useState(initialFilters.site_id || '');
  const [imei, setImei] = useState(initialFilters.imei || '');
  const [globalId, setGlobalId] = useState(initialFilters.global_id || '');
  const [siteName, setSiteName] = useState(initialFilters.site_name || '');
  
  const [fromDate, setFromDate] = useState(initialFilters.date_from ? new Date(initialFilters.date_from) : null);
  const [toDate, setToDate] = useState(initialFilters.date_to ? new Date(initialFilters.date_to) : null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadStates();
      if (initialFilters.state_id) loadDistricts(initialFilters.state_id);
      if (initialFilters.district_id) loadClusters(initialFilters.district_id);
    }
  }, [visible]);

  const loadStates = async () => {
    try {
      setLoading(true);
      const response = await api.getStates();
      if (response.status === 'success') setStates(response.data);
    } catch (error) { console.error('Error loading states:', error); } 
    finally { setLoading(false); }
  };

  const loadDistricts = async (state_id) => {
    if (!state_id) { setDistricts([]); return; }
    try {
      const response = await api.getDistricts(state_id);
      if (response.status === 'success') setDistricts(response.data);
    } catch (error) { console.error('Error loading districts:', error); }
  };

  const loadClusters = async (district_id) => {
    if (!district_id) { setClusters([]); return; }
    try {
      const response = await api.getClusters(district_id);
      if (response.status === 'success') setClusters(response.data);
    } catch (error) { console.error('Error loading clusters:', error); }
  };

  const handleStateChange = (state_id) => {
    setSelectedState(state_id); setSelectedDistrict(''); setSelectedCluster('');
    setDistricts([]); setClusters([]);
    if (state_id) loadDistricts(state_id);
  };

  const handleDistrictChange = (district_id) => {
    setSelectedDistrict(district_id); setSelectedCluster(''); setClusters([]);
    if (district_id) loadClusters(district_id);
  };

  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    if (type !== 'site_id') setSiteId('');
    if (type !== 'imei') setImei('');
    if (type !== 'global_id') setGlobalId('');
    if (type !== 'site_name') setSiteName('');
  };

  const handleApply = () => {
    const filters = {
      state_id: selectedState, district_id: selectedDistrict, cluster_id: selectedCluster,
      search_type: searchType, site_id: siteId, imei: imei, global_id: globalId, site_name: siteName,
      date_from: fromDate ? fromDate.toISOString().split('T')[0] : '',
      date_to: toDate ? toDate.toISOString().split('T')[0] : '',
    };
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setSelectedState(''); setSelectedDistrict(''); setSelectedCluster('');
    setSearchType(''); setSiteId(''); setImei(''); setGlobalId(''); setSiteName('');
    setFromDate(null); setToDate(null); setDistricts([]); setClusters([]);
    onApply({}); // Instantly clear filters on parent page
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Sites</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2189e5" />
                <Text style={styles.loadingText}>Loading filters...</Text>
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📍 Location</Text>
                  
                  <View style={styles.filterGroup}>
                    <Text style={styles.label}>State</Text>
                    <View style={styles.pickerContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity style={[styles.chip, !selectedState && styles.chipActive]} onPress={() => handleStateChange('')}>
                          <Text style={[styles.chipText, !selectedState && styles.chipTextActive]}>All</Text>
                        </TouchableOpacity>
                        {states.map((state) => (
                          <TouchableOpacity key={state.state_id} style={[styles.chip, selectedState === state.state_id && styles.chipActive]} onPress={() => handleStateChange(state.state_id)}>
                            <Text style={[styles.chipText, selectedState === state.state_id && styles.chipTextActive]}>{state.state_name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                  {selectedState && districts.length > 0 && (
                    <View style={styles.filterGroup}>
                      <Text style={styles.label}>District</Text>
                      <View style={styles.pickerContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <TouchableOpacity style={[styles.chip, !selectedDistrict && styles.chipActive]} onPress={() => handleDistrictChange('')}>
                            <Text style={[styles.chipText, !selectedDistrict && styles.chipTextActive]}>All</Text>
                          </TouchableOpacity>
                          {districts.map((district) => (
                            <TouchableOpacity key={district.district_id} style={[styles.chip, selectedDistrict === district.district_id && styles.chipActive]} onPress={() => handleDistrictChange(district.district_id)}>
                              <Text style={[styles.chipText, selectedDistrict === district.district_id && styles.chipTextActive]}>{district.district_name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  )}

                  {selectedDistrict && clusters.length > 0 && (
                    <View style={styles.filterGroup}>
                      <Text style={styles.label}>Cluster</Text>
                      <View style={styles.pickerContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <TouchableOpacity style={[styles.chip, !selectedCluster && styles.chipActive]} onPress={() => setSelectedCluster('')}>
                            <Text style={[styles.chipText, !selectedCluster && styles.chipTextActive]}>All</Text>
                          </TouchableOpacity>
                          {clusters.map((cluster) => (
                            <TouchableOpacity key={cluster.cluster_id} style={[styles.chip, selectedCluster === cluster.cluster_id && styles.chipActive]} onPress={() => setSelectedCluster(cluster.cluster_id)}>
                              <Text style={[styles.chipText, selectedCluster === cluster.cluster_id && styles.chipTextActive]}>{cluster.cluster_name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🔍 Search By</Text>
                  <View style={styles.searchTypeContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {[
                        { type: 'site_id', label: 'Site ID' },
                        { type: 'imei', label: 'IMEI' },
                        { type: 'global_id', label: 'Global ID' },
                        { type: 'site_name', label: 'Site Name' }
                      ].map(({ type, label }) => (
                        <TouchableOpacity key={type} style={[styles.searchTypeChip, searchType === type && styles.searchTypeChipActive]} onPress={() => handleSearchTypeChange(type)}>
                          <Text style={[styles.searchTypeText, searchType === type && styles.searchTypeTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {searchType === 'site_id' && <TextInput style={styles.input} placeholder="Enter Site ID" value={siteId} onChangeText={setSiteId} placeholderTextColor="#999" />}
                  {searchType === 'imei' && <TextInput style={styles.input} placeholder="Enter IMEI" value={imei} onChangeText={setImei} keyboardType="numeric" placeholderTextColor="#999" />}
                  {searchType === 'global_id' && <TextInput style={styles.input} placeholder="Enter Global ID" value={globalId} onChangeText={setGlobalId} placeholderTextColor="#999" />}
                  {searchType === 'site_name' && <TextInput style={styles.input} placeholder="Enter Site Name" value={siteName} onChangeText={setSiteName} placeholderTextColor="#999" />}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📅 Date Range</Text>
                  <View style={styles.dateRow}>
                    <View style={styles.dateGroup}>
                      <Text style={styles.label}>From Date</Text>
                      <TouchableOpacity style={styles.dateButton} onPress={() => setShowFromPicker(true)}>
                        <Text style={styles.dateButtonText}>{fromDate ? fromDate.toLocaleDateString() : 'Select Date'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.dateGroup}>
                      <Text style={styles.label}>To Date</Text>
                      <TouchableOpacity style={styles.dateButton} onPress={() => setShowToPicker(true)}>
                        <Text style={styles.dateButtonText}>{toDate ? toDate.toLocaleDateString() : 'Select Date'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {showFromPicker && (
                    <DateTimePicker value={fromDate || new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, selectedDate) => { setShowFromPicker(false); if (selectedDate) setFromDate(selectedDate); }} />
                  )}
                  {showToPicker && (
                    <DateTimePicker value={toDate || new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, selectedDate) => { setShowToPicker(false); if (selectedDate) setToDate(selectedDate); }} />
                  )}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#233344' },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { fontSize: 18, color: '#666', fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  loadingContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#233344', marginBottom: 12 },
  filterGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  pickerContainer: { marginBottom: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f5f5f5', marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#e8f4f8', borderColor: '#2189e5' },
  chipText: { fontSize: 14, color: '#666', fontWeight: '500' },
  chipTextActive: { color: '#2189e5', fontWeight: '700' },
  searchTypeContainer: { marginBottom: 12 },
  searchTypeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f5f5f5', marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  searchTypeChipActive: { backgroundColor: '#e8f4f8', borderColor: '#2189e5' },
  searchTypeText: { fontSize: 14, color: '#666', fontWeight: '500' },
  searchTypeTextActive: { color: '#2189e5', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15, color: '#233344', backgroundColor: '#f9f9f9' },
  dateRow: { flexDirection: 'row', gap: 12 }, dateGroup: { flex: 1 },
  dateButton: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, backgroundColor: '#f9f9f9' },
  dateButtonText: { fontSize: 14, color: '#233344', textAlign: 'center' },
  actionButtons: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  resetButton: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  resetButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  applyButton: { flex: 2, padding: 14, borderRadius: 8, backgroundColor: '#2189e5', alignItems: 'center', elevation: 2, shadowColor: '#2189e5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  applyButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' }
});

export default FilterModal;