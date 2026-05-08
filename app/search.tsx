import React, { useState, createElement } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, ActivityIndicator, ScrollView, Platform, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons'; // NEW: Premium Icons

const supabase = createClient(
  'https://lsquxrvufehselooyenj.supabase.co',
  'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'
);

const SPORTS = ['Soccer', 'Basketball', 'Hockey', 'Baseball', 'Tennis'];
const FORMATS = ['5v5', '7v7', '9v9', '11v11'];

// Helper for local dates
const getLocalYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function Search() {
  const router = useRouter();
  
  const [fieldSport, setFieldSport] = useState('Soccer');
  const [fieldFormat, setFieldFormat] = useState('11v11');
  const [fieldPostalCode, setFieldPostalCode] = useState('H2X');
  
  const [startDateStr, setStartDateStr] = useState(getLocalYYYYMMDD(new Date()));
  const [endDateStr, setEndDateStr] = useState(getLocalYYYYMMDD(new Date(new Date().setDate(new Date().getDate() + 7))));
  
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('22:00');
  const [weekendsOnly, setWeekendsOnly] = useState(false);
  
  const [groupedFields, setGroupedFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);

  const timeOptions = Array.from({ length: 18 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`);

  const searchFields = async () => {
    setLoadingFields(true);
    try {
      const fRes = await fetch(`http://localhost:3000/api/fields/available?sport=${fieldSport}&startDate=${startDateStr}&endDate=${endDateStr}&postalCode=${fieldPostalCode}`);
      let data = await fRes.json();
      
      data = data.filter(f => f.format === fieldFormat);
      if (weekendsOnly) {
        data = data.filter(f => {
          const day = new Date(f.start_time).getDay();
          return day === 0 || day === 6; 
        });
      }
      data = data.filter(f => {
        const fieldHour = new Date(f.start_time).getHours();
        return fieldHour >= parseInt(startTime) && fieldHour <= parseInt(endTime);
      });

      const uniqueClubs = [];
      const map = new Map();
      for (const item of data) {
          if(!map.has(item.field_id)){
              map.set(item.field_id, true);
              uniqueClubs.push({ field_id: item.field_id, field_name: item.field_name, distance_km: item.distance_km });
          }
      }
      setGroupedFields(uniqueClubs);
    } catch (error) { alert("Error connecting to backend."); } finally { setLoadingFields(false); }
  };

  const goToClub = (field) => {
      router.push(`/club-availabilities?fieldId=${field.field_id}&fieldName=${field.field_name}&startDate=${startDateStr}&endDate=${endDateStr}&startTime=${startTime}&endTime=${endTime}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* --- PRO HEADER --- */}
        <View style={styles.headerContainer}>
            <View>
                <Text style={styles.greeting}>Welcome, Coach</Text>
                <Text style={styles.title}>Find a Facility</Text>
            </View>
            <TouchableOpacity style={styles.profileIcon} onPress={() => router.push('/edit-team')}>
                <Ionicons name="person" size={24} color="#1A73E8" />
            </TouchableOpacity>
        </View>

        {/* --- MODERN FILTER CARD --- */}
        <View style={styles.proCard}>
          
          <View style={styles.inputGroupRow}>
              <View style={styles.inputGroup}>
                  <Text style={styles.label}><Ionicons name="football" size={14}/> Sport</Text>
                  <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={fieldSport} onValueChange={setFieldSport}>{SPORTS.map(s => <Picker.Item key={s} label={s} value={s} />)}</Picker></View>
              </View>
              <View style={styles.inputGroup}>
                  <Text style={styles.label}><Ionicons name="people" size={14}/> Format</Text>
                  <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={fieldFormat} onValueChange={setFieldFormat}>{FORMATS.map(f => <Picker.Item key={f} label={f} value={f} />)}</Picker></View>
              </View>
          </View>

          <View style={styles.inputGroupRow}>
              <View style={styles.inputGroup}>
                  <Text style={styles.label}><Ionicons name="calendar" size={14}/> From</Text>
                  {Platform.OS === 'web' && createElement('input', { type: 'date', value: startDateStr, onChange: (e) => setStartDateStr(e.target.value), style: styles.webDate })}
              </View>
              <View style={styles.inputGroup}>
                  <Text style={styles.label}><Ionicons name="calendar" size={14}/> To</Text>
                  {Platform.OS === 'web' && createElement('input', { type: 'date', value: endDateStr, onChange: (e) => setEndDateStr(e.target.value), style: styles.webDate })}
              </View>
          </View>

          <View style={styles.inputGroupRow}>
              <View style={styles.inputGroup}>
                  <Text style={styles.label}><Ionicons name="time" size={14}/> Time</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <View style={[styles.pickerWrapper, {flex: 1}]}><Picker style={styles.picker} selectedValue={startTime} onValueChange={setStartTime}>{timeOptions.map(t => <Picker.Item key={t} label={t} value={t} />)}</Picker></View>
                      <Text style={{marginHorizontal: 5, color: '#888'}}>-</Text>
                      <View style={[styles.pickerWrapper, {flex: 1}]}><Picker style={styles.picker} selectedValue={endTime} onValueChange={setEndTime}>{timeOptions.map(t => <Picker.Item key={t} label={t} value={t} />)}</Picker></View>
                  </View>
              </View>
          </View>

          <View style={styles.inputGroupRow}>
              <View style={[styles.inputGroup, {flexDirection: 'row', alignItems: 'center'}]}>
                  <Checkbox style={styles.checkbox} value={weekendsOnly} onValueChange={setWeekendsOnly} color={weekendsOnly ? '#1A73E8' : undefined} />
                  <Text style={styles.checkLabel}>Weekends Only</Text>
              </View>
              <View style={styles.inputGroup}>
                  <View style={styles.searchBar}>
                      <Ionicons name="location" size={18} color="#888" style={{marginLeft: 10}}/>
                      <TextInput style={styles.searchInput} value={fieldPostalCode} onChangeText={(t) => setFieldPostalCode(t.toUpperCase())} maxLength={3} placeholder="Postal" />
                  </View>
              </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={searchFields}>
            <Text style={styles.primaryButtonText}>Search Availability</Text>
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* --- RESULTS --- */}
        <Text style={styles.sectionTitle}>Available Facilities</Text>
        
        {loadingFields ? <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 30}} /> : (
          <View style={{paddingBottom: 100}}>
            {groupedFields.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyStateText}>No facilities match your search.</Text>
                </View>
            ) : (
                groupedFields.map((item) => (
                <TouchableOpacity key={item.field_id} style={styles.resultCard} onPress={() => goToClub(item)}>
                    <View style={styles.resultInfo}>
                        <Text style={styles.resultTitle}>{item.field_name}</Text>
                        <View style={styles.badgeRow}>
                            <View style={styles.badge}><Text style={styles.badgeText}>{fieldSport}</Text></View>
                            <View style={styles.badge}><Text style={styles.badgeText}>{fieldFormat}</Text></View>
                        </View>
                    </View>
                    <View style={styles.resultDistance}>
                        <Ionicons name="navigate" size={16} color="#1A73E8" />
                        <Text style={styles.distanceText}>{item.distance_km ? item.distance_km.toFixed(1) : 0} km</Text>
                    </View>
                </TouchableOpacity>
            )))}
          </View>
        )}
      </ScrollView>

      {/* --- FLOATING BOTTOM NAV BAR --- */}
      <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/search')}>
              <Ionicons name="home" size={24} color="#1A73E8" />
              <Text style={[styles.navText, {color: '#1A73E8'}]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/matches')}>
              <Ionicons name="calendar-outline" size={24} color="#888" />
              <Text style={styles.navText}>Matches</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/manage-roster')}>
              <Ionicons name="people-outline" size={24} color="#888" />
              <Text style={styles.navText}>Roster</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/')}>
              <Ionicons name="log-out-outline" size={24} color="#dc3545" />
              <Text style={styles.navText}>Logout</Text>
          </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greeting: { fontSize: 14, color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#111' },
  profileIcon: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  
  proCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 30 },
  inputGroupRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  inputGroup: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
  pickerWrapper: { backgroundColor: '#F1F3F4', borderRadius: 10, overflow: 'hidden', height: 45, justifyContent: 'center' },
  picker: { height: 45, borderWidth: 0, backgroundColor: 'transparent' },
  webDate: { height: 45, borderRadius: 10, border: 'none', backgroundColor: '#F1F3F4', paddingHorizontal: 15, fontFamily: 'inherit', color: '#333' },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F3F4', borderRadius: 10, height: 45 },
  searchInput: { flex: 1, paddingHorizontal: 10, fontWeight: '600', color: '#333' },
  checkbox: { width: 20, height: 20, borderRadius: 4, marginRight: 8 },
  checkLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  
  primaryButton: { backgroundColor: '#1A73E8', borderRadius: 12, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111', marginBottom: 15 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyStateText: { color: '#888', fontSize: 16, marginTop: 10, fontWeight: '500' },

  resultCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: '#F1F3F4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#555' },
  resultDistance: { alignItems: 'center', backgroundColor: '#E8F0FE', padding: 10, borderRadius: 12 },
  distanceText: { fontSize: 12, fontWeight: 'bold', color: '#1A73E8', marginTop: 4 },

  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, paddingBottom: Platform.OS === 'ios' ? 30 : 15, borderTopWidth: 1, borderTopColor: '#EEE' },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 11, fontWeight: '600', color: '#888', marginTop: 4 }
});
