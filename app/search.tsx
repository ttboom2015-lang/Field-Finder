import React, { useState, useEffect, createElement } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, Platform, SafeAreaView, TextInput, Modal, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

// NOTE: IF YOU WANT TO KEEP ADDRESS AUTOCOMPLETE FOR MVP, REMOVE IT FROM WEB OR USE STANDARD TEXT INPUT
// (I am keeping it as a standard TextInput here so it doesn't crash your web view!)

const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');

const SPORTS = ['Soccer', 'Basketball', 'Hockey', 'Baseball', 'Tennis'];
const SOCCER_FORMATS = ['5v5', '7v7', '9v9', '11v11'];
const AGE_GROUPS = Array.from({ length: 15 }, (_, i) => `U${i + 7}`);

const getLocalYYYYMMDD = (date) => {
    const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export default function Search() {
  const router = useRouter();
  
  // --- USER DATA ---
  const [myTeamId, setMyTeamId] = useState(null);

  // --- TOGGLE STATE ---
  const [searchMode, setSearchMode] = useState('fields'); // 'fields' or 'teams'

  // --- SHARED FILTERS ---
  const [sport, setSport] = useState('Soccer');
  const [postalCode, setPostalCode] = useState('H2X');
  const [targetDateStr, setTargetDateStr] = useState(getLocalYYYYMMDD(new Date()));
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  
  // --- FIELD SPECIFIC FILTERS ---
  const [soccerFormat, setSoccerFormat] = useState('11v11');
  const [weekendsOnly, setWeekendsOnly] = useState(false);
  
  // --- TEAM SPECIFIC FILTERS ---
  const [ageGroup, setAgeGroup] = useState('U12');
  const [division, setDivision] = useState('Division 1');
  const [gender, setGender] = useState('Boys');

  // --- RESULTS STATES ---
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- MODAL (INVITATION) STATES ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [myOpenMatches, setMyOpenMatches] = useState([]);
  const [selectedMatches, setSelectedMatches] = useState([]);

  const timeOptions = Array.from({ length: 18 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`);

  // On Load: Get Logged In Manager's Team ID (Needed for Invites)
  useEffect(() => {
    const fetchMyTeam = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('teams').select('id').eq('manager_id', user.id).limit(1).maybeSingle();
        if (data) setMyTeamId(data.id);
      }
    };
    fetchMyTeam();
  }, []);

  const getActualFormat = () => {
      if (sport === 'Basketball') return '5v5';
      if (['Tennis', 'Hockey', 'Baseball'].includes(sport)) return 'Other';
      return soccerFormat;
  };

  const handleSearch = async () => {
    if (!postalCode) { alert("Please enter a postal code."); return; }
    setLoading(true);
    setResults([]);
    
    try {
      if (searchMode === 'fields') {
          // Replace localhost with IP for mobile testing
          const fRes = await fetch(`https://fieldfinder-api.onrender.com/api/fields/available?sport=${sport}&startDate=${targetDateStr}&endDate=${targetDateStr}&postalCode=${postalCode}`);
          let data = await fRes.json();
          
          const targetFormat = getActualFormat();
          data = data.filter(f => f.format === targetFormat);
          if (weekendsOnly) data = data.filter(f => [0, 6].includes(new Date(f.start_time).getDay()));
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
          setResults(uniqueClubs);
      } else {
          // Replace localhost with IP for mobile testing
          const tRes = await fetch(`https://fieldfinder-api.onrender.com/api/teams/available?sport=${sport}&postalCode=${postalCode}&ageGroup=${ageGroup}&division=${division}&gender=${gender}&targetDate=${targetDateStr}&startTime=${startTime}&endTime=${endTime}`);
          const data = await tRes.json();
          setResults(data);
      }
    } catch (error) { alert("Error connecting to backend."); } finally { setLoading(false); }
  };

  // --- NEW: INVITATION LOGIC (PORTED FROM TEAMFINDER) ---
  const handleChallengeClick = async (opponent) => {
    if (!myTeamId) { alert("Please create a team profile first!"); return; }
    setSelectedOpponent(opponent);
    setSelectedMatches([]); 
    setIsModalVisible(true); 
    setLoadingSlots(true);   

    try {
      const response = await fetch(`https://fieldfinder-api.onrender.com/api/my-open-matches?myTeamId=${myTeamId}`);
      const data = await response.json();
      setMyOpenMatches(data || []);
    } catch (err) { alert("Error fetching your reservations."); } finally { setLoadingSlots(false); }
  };

  const toggleMatchSelection = (matchId) => {
      if (selectedMatches.includes(matchId)) setSelectedMatches(selectedMatches.filter(id => id !== matchId));
      else setSelectedMatches([...selectedMatches, matchId]);
  };

  const confirmChallenge = async () => {
    if (selectedMatches.length === 0) return;
    try {
      const response = await fetch('https://fieldfinder-api.onrender.com/api/add-opponent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchIds: selectedMatches, opponentTeamId: selectedOpponent.team_id, myTeamId: myTeamId })
      });
      if (response.ok) { alert(`Success! Invite sent.`); setIsModalVisible(false); } 
      else { const result = await response.json(); alert("Error: " + result.error); }
    } catch (err) { alert("Network Error"); }
  };
  // ------------------------------------------------------

  const getStatusColor = (status) => {
      if (status === 'green') return '#28a745'; 
      if (status === 'red') return '#dc3545';   
      return '#ffc107'; 
  };
  
  const getStatusText = (status) => {
      if (status === 'green') return 'Available';
      if (status === 'red') return 'Booked / Busy';
      return 'Status Unknown';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <View style={styles.headerContainer}>
            <View>
                <Text style={styles.greeting}>Welcome, Manager</Text>
                <Text style={styles.title}>Dashboard</Text>
            </View>
            <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity style={styles.profileIcon} onPress={() => router.push('/team-availability')}>
                    <Ionicons name="calendar" size={24} color="#1A73E8" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileIcon} onPress={() => router.push('/edit-team')}>
                    <Ionicons name="person" size={24} color="#1A73E8" />
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tabBtn, searchMode === 'fields' && styles.tabActive]} onPress={() => {setSearchMode('fields'); setResults([]);}}>
                <Ionicons name="location" size={16} color={searchMode === 'fields' ? '#fff' : '#666'} />
                <Text style={[styles.tabTxt, searchMode === 'fields' && {color: '#fff'}]}> Find Fields</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, searchMode === 'teams' && styles.tabActive]} onPress={() => {setSearchMode('teams'); setResults([]);}}>
                <Ionicons name="people" size={16} color={searchMode === 'teams' ? '#fff' : '#666'} />
                <Text style={[styles.tabTxt, searchMode === 'teams' && {color: '#fff'}]}> Find Opponents</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.proCard}>
          <View style={styles.inputGroupRow}>
              <View style={styles.inputGroup}>
                  <Text style={styles.label}>Sport</Text>
                  <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={sport} onValueChange={setSport}>{SPORTS.map(s => <Picker.Item key={s} label={s} value={s} />)}</Picker></View>
              </View>
              
              <View style={styles.inputGroup}>
                  <Text style={styles.label}>{searchMode === 'fields' ? 'Format' : 'Gender'}</Text>
                  <View style={styles.pickerWrapper}>
                      {searchMode === 'fields' ? (
                          sport === 'Soccer' ? (
                              <Picker style={styles.picker} selectedValue={soccerFormat} onValueChange={setSoccerFormat}>{SOCCER_FORMATS.map(f => <Picker.Item key={f} label={f} value={f} />)}</Picker>
                          ) : (
                              <View style={{height: 45, justifyContent: 'center', paddingHorizontal: 15}}><Text style={{color: '#666', fontWeight: 'bold'}}>{getActualFormat()}</Text></View>
                          )
                      ) : (
                          <Picker style={styles.picker} selectedValue={gender} onValueChange={setGender}><Picker.Item label="Boys" value="Boys" /><Picker.Item label="Girls" value="Girls" /></Picker>
                      )}
                  </View>
              </View>
          </View>

          {searchMode === 'teams' && (
              <View style={styles.inputGroupRow}>
                  <View style={styles.inputGroup}><Text style={styles.label}>Age Group</Text><View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={ageGroup} onValueChange={setAgeGroup}>{AGE_GROUPS.map(a => <Picker.Item key={a} label={a} value={a} />)}</Picker></View></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Division</Text><View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={division} onValueChange={setDivision}><Picker.Item label="Div 1" value="Division 1" /><Picker.Item label="Div 2" value="Division 2" /><Picker.Item label="Div 3" value="Division 3" /></Picker></View></View>
              </View>
          )}

          <Text style={styles.label}>Check Availability For:</Text>
          <View style={styles.inputGroupRow}>
              <View style={styles.inputGroup}>
                  {Platform.OS === 'web' ? (
                     createElement('input', { type: 'date', value: targetDateStr, onChange: (e) => setTargetDateStr(e.target.value), style: styles.webDate })
                  ) : (
                     <TextInput style={styles.searchInput} value={targetDateStr} onChangeText={setTargetDateStr} placeholder="YYYY-MM-DD" />
                  )}
              </View>
              <View style={styles.inputGroup}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <View style={[styles.pickerWrapper, {flex: 1}]}><Picker style={styles.picker} selectedValue={startTime} onValueChange={setStartTime}>{timeOptions.map(t => <Picker.Item key={t} label={t} value={t} />)}</Picker></View>
                      <Text style={{marginHorizontal: 5, color: '#888'}}>-</Text>
                      <View style={[styles.pickerWrapper, {flex: 1}]}><Picker style={styles.picker} selectedValue={endTime} onValueChange={setEndTime}>{timeOptions.map(t => <Picker.Item key={t} label={t} value={t} />)}</Picker></View>
                  </View>
              </View>
          </View>

          <View style={styles.inputGroupRow}>
              {searchMode === 'fields' && (
                  <View style={[styles.inputGroup, {flexDirection: 'row', alignItems: 'center'}]}>
                      <Checkbox style={styles.checkbox} value={weekendsOnly} onValueChange={setWeekendsOnly} color={weekendsOnly ? '#1A73E8' : undefined} />
                      <Text style={styles.checkLabel}>Weekends Only</Text>
                  </View>
              )}
              <View style={styles.inputGroup}>
                  <Text style={styles.label}>Postal Code</Text>
                  <View style={styles.searchBar}>
                      <Ionicons name="location" size={18} color="#888" style={{marginLeft: 10}}/>
                      <TextInput style={styles.searchInput} value={postalCode} onChangeText={(t) => setPostalCode(t.toUpperCase())} maxLength={3} placeholder="e.g. H2X" />
                  </View>
              </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSearch}>
            <Text style={styles.primaryButtonText}>Search {searchMode === 'fields' ? 'Facilities' : 'Teams'}</Text>
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Results</Text>
        {loading ? <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 30}} /> : (
          <View style={{paddingBottom: 100}}>
            {results.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyStateText}>No results found.</Text>
                </View>
            ) : searchMode === 'fields' ? (
                results.map((item) => (
                    <TouchableOpacity key={item.field_id} style={styles.resultCard} onPress={() => router.push(`/club-availabilities?fieldId=${item.field_id}&fieldName=${item.field_name}&startDate=${targetDateStr}&endDate=${targetDateStr}&startTime=${startTime}&endTime=${endTime}&weekendsOnly=${weekendsOnly}`)}>
                        <View style={styles.resultInfo}>
                            <Text style={styles.resultTitle}>{item.field_name}</Text>
                            <View style={styles.badgeRow}>
                                <View style={styles.badge}><Text style={styles.badgeText}>{sport}</Text></View>
                                <View style={styles.badge}><Text style={styles.badgeText}>{getActualFormat()}</Text></View>
                            </View>
                        </View>
                        <View style={styles.resultDistance}>
                            <Ionicons name="navigate" size={16} color="#1A73E8" />
                            <Text style={styles.distanceText}>{item.distance_km ? item.distance_km.toFixed(1) : 0} km</Text>
                        </View>
                    </TouchableOpacity>
                ))
            ) : (
                results.map((item) => (
                    // INSTEAD OF ROUTING, WE TRIGGER THE MODAL DIRECTLY HERE:
                    <TouchableOpacity key={item.team_id} style={[styles.resultCard, { borderLeftWidth: 6, borderLeftColor: getStatusColor(item.calculated_status) }]} onPress={() => handleChallengeClick(item)}>
                        <View style={styles.avatar}><Ionicons name="shield-outline" size={24} color={getStatusColor(item.calculated_status)}/></View>
                        <View style={[styles.resultInfo, {marginLeft: 15}]}>
                            <Text style={styles.resultTitle}>{item.team_name}</Text>
                            <Text style={{fontSize: 12, color: getStatusColor(item.calculated_status), fontWeight: 'bold', marginTop: 2}}>
                                ● {getStatusText(item.calculated_status)}
                            </Text>
                            <Text style={{fontSize: 12, color: '#666', marginTop: 4}}><Ionicons name="location" size={12}/> {item.distance_km ? item.distance_km.toFixed(1) : 0} km away</Text>
                        </View>
                        <View style={styles.challengeBtn}>
                            <Text style={styles.challengeTxt}>Invite</Text>
                        </View>
                    </TouchableOpacity>
                ))
            )}
          </View>
        )}
      </ScrollView>

      {/* --- INVITATION MODAL --- */}
      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invite {selectedOpponent?.team_name}</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}><Ionicons name="close" size={28} color="#888"/></TouchableOpacity>
            </View>
            
            {loadingSlots ? (
                <ActivityIndicator size="large" color="#1A73E8" style={{marginVertical: 20}} />
            ) : myOpenMatches.length === 0 ? (
              <View style={{alignItems: 'center', padding: 20}}>
                  <Ionicons name="alert-circle-outline" size={40} color="#dc3545" />
                  <Text style={{color: '#dc3545', fontWeight: 'bold', textAlign: 'center', marginTop: 10}}>
                    You have no open fields.{"\n"}Please book a field in the "Find Fields" tab first!
                  </Text>
              </View>
            ) : (
              <>
                <Text style={{color: '#555', marginBottom: 15}}>Select your booked fields to offer them:</Text>
                <FlatList 
                  data={myOpenMatches} 
                  keyExtractor={i => i.id.toString()} 
                  style={{maxHeight: 400}}
                  renderItem={({ item }) => {
                    const isSelected = selectedMatches.includes(item.id);
                    const d = new Date(item.field_availabilities.start_time);
                    return (
                      <TouchableOpacity style={[styles.modalSlot, isSelected && styles.modalSlotSelected]} onPress={() => toggleMatchSelection(item.id)}>
                        <View style={{flex:1}}>
                          <Text style={[styles.slotName, isSelected && {color: '#fff'}]}>{item.field_availabilities.fields?.name || "Field"}</Text>
                          <Text style={[styles.slotDetails, isSelected && {color: '#fff'}]}>
                            {d.toLocaleDateString('en-CA')} • {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </Text>
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                      </TouchableOpacity>
                    );
                  }} 
                />
              </>
            )}
            
            {selectedMatches.length > 0 && (
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmChallenge}>
                    <Text style={styles.confirmTxt}>Send Invite ({selectedMatches.length * 30} mins)</Text>
                </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
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
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#111' },
  profileIcon: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  tabRow: { flexDirection: 'row', backgroundColor: '#E0E0E0', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#1A73E8', elevation: 2 },
  tabTxt: { fontWeight: 'bold', color: '#666', fontSize: 15 },
  proCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 30 },
  inputGroupRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  inputGroup: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
  pickerWrapper: { backgroundColor: '#F1F3F4', borderRadius: 10, overflow: 'hidden', height: 45, justifyContent: 'center' },
  picker: { height: 45, borderWidth: 0, backgroundColor: 'transparent' },
  webDate: { height: 45, borderRadius: 10, border: 'none', backgroundColor: '#F1F3F4', paddingHorizontal: 15, fontFamily: 'inherit', color: '#333', width: '100%' },
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
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F1F3F4', justifyContent: 'center', alignItems: 'center' },
  
  // MODAL STYLES
  challengeBtn: { backgroundColor: '#E8F0FE', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  challengeTxt: { color: '#1A73E8', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  modalSlot: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  modalSlotSelected: { backgroundColor: '#1A73E8', borderColor: '#1A73E8' },
  slotName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  slotDetails: { fontSize: 14, color: '#666', marginTop: 4 },
  confirmBtn: { backgroundColor: '#1A73E8', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  confirmTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, paddingBottom: Platform.OS === 'ios' ? 30 : 15, borderTopWidth: 1, borderTopColor: '#EEE' },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 11, fontWeight: '600', color: '#888', marginTop: 4 }
});
