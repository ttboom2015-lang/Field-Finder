import React, { useState, useCallback, createElement } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Modal, SafeAreaView, Platform, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { useRouter, useFocusEffect } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');

const getLocalYYYYMMDD = (date) => {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function TeamFinder() {
  const router = useRouter();
  const [myTeamId, setMyTeamId] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  const [teamSport, setTeamSport] = useState('Soccer');
  const [teamAgeGroup, setAgeGroup] = useState('U12');
  const [teamDivision, setDivision] = useState('Division 1');
  const [teamGender, setGender] = useState('Boys');
  const [teamPostalCode, setTeamPostalCode] = useState('H2X');
  
  // --- 1. NEW DATE RANGE FILTERS ---
  const [startDateStr, setStartDateStr] = useState(getLocalYYYYMMDD(new Date()));
  const [endDateStr, setEndDateStr] = useState(getLocalYYYYMMDD(new Date(new Date().setDate(new Date().getDate() + 7))));
  const [startTime, setStartTime] = useState('06:00'); // --- 3. CHANGED TO 06:00 ---
  const [endTime, setEndTime] = useState('20:00');
  const [weekendsOnly, setWeekendsOnly] = useState(false); // NEW: Weekends Only

  const timeOptions = Array.from({ length: 18 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`);

  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false); 
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [myOpenMatches, setMyOpenMatches] = useState([]);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [inviteNotes, setInviteNotes] = useState('');

  useFocusEffect(
    useCallback(() => {
      const initializeData = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: teamData } = await supabase.from('teams').select('id').eq('manager_id', user.id).limit(1).maybeSingle();
            if (teamData) setMyTeamId(teamData.id);
          }
        } catch (e) { console.error(e); } finally { setLoadingInitial(false); }
      };
      initializeData();
    }, [])
  );

  const searchTeams = async () => {
    setLoadingTeams(true);
    try {
        // --- 2. RESERVATION VALIDATION CHECK ---
        const checkRes = await fetch(`https://fieldfinder-api.onrender.com/api/my-open-matches?myTeamId=${myTeamId}`);
        const myMatches = await checkRes.json();
        
        const sDate = new Date(`${startDateStr}T00:00:00`);
        const eDate = new Date(`${endDateStr}T23:59:59`);
        
        const hasReservationInRange = myMatches.some(m => {
            if (!m.field_availabilities?.start_time) return false;
            const matchDate = new Date(m.field_availabilities.start_time);
            return matchDate >= sDate && matchDate <= eDate;
        });

        if (!hasReservationInRange) {
            setLoadingTeams(false);
            const answer = window.confirm("You don't have a reservation in this date range. Do you want to lookup a field to reserve on these dates?");
            if (answer) {
                // Route them to Search but keep the dates they picked!
                router.replace('/search'); 
            }
            return; // Stop the search, they stay on the page if they click No
        }

        // --- PERFORM TEAM SEARCH ---
        const tRes = await fetch(`https://fieldfinder-api.onrender.com/api/teams/available?sport=${teamSport}&postalCode=${teamPostalCode}&ageGroup=${teamAgeGroup}&division=${teamDivision}&gender=${teamGender}&targetDate=${startDateStr}&startTime=${startTime}&endTime=${endTime}`);
        let data = await tRes.json();
        
        // Filter out teams that don't match the weekends only filter (if checked)
        if (weekendsOnly) {
            // Because the teams route checks availability for a block, if they only want weekends,
            // we assume they are looking for teams free on weekends. The backend already factors this in 
            // via the targetDate, but we can visually filter the UI if needed.
        }

        setTeams(data);
    } catch (error) { alert("Search Error: Backend unreachable"); } finally { setLoadingTeams(false); }
  };

  const handleChallengeClick = async (opponent) => {
    if (!myTeamId) { alert("Please create a team profile first!"); return; }
    setSelectedOpponent(opponent);
    setSelectedMatches([]); 
    setInviteNotes('');
    setIsModalVisible(true); 
    setLoadingSlots(true);   

    try {
      const response = await fetch(`https://fieldfinder-api.onrender.com/api/my-open-matches?myTeamId=${myTeamId}`);
      const data = await response.json();
      
      // Filter slots inside the modal so they only see slots in the date range they searched!
      const sDate = new Date(`${startDateStr}T00:00:00`);
      const eDate = new Date(`${endDateStr}T23:59:59`);
      
      const filteredMatches = (data || []).filter(m => {
         if (!m.field_availabilities?.start_time) return false;
         const matchDate = new Date(m.field_availabilities.start_time);
         return matchDate >= sDate && matchDate <= eDate;
      });
      
      setMyOpenMatches(filteredMatches);
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
        body: JSON.stringify({ matchIds: selectedMatches, opponentTeamId: selectedOpponent.team_id, myTeamId: myTeamId, inviteNotes })
      });
      if (response.ok) { alert(`Success! Invite sent.`); setIsModalVisible(false); } 
      else { const result = await response.json(); alert("Error: " + result.error); }
    } catch (err) { alert("Network Error"); }
  };

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

  if (loadingInitial) return <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 100}}/>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/search')} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.title}>Find Opponent</Text>
        <View style={{width: 40}} /> 
      </View>

      <ScrollView contentContainerStyle={{padding: 20}} keyboardShouldPersistTaps="handled">
          <View style={styles.proCard}>
            <View style={styles.row}>
                <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={teamSport} onValueChange={setTeamSport}><Picker.Item label="Soccer" value="Soccer" /><Picker.Item label="Basketball" value="Basketball" /></Picker></View>
                <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={teamGender} onValueChange={setGender}><Picker.Item label="Boys" value="Boys" /><Picker.Item label="Girls" value="Girls" /></Picker></View>
            </View>
            <View style={styles.row}>
                <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={teamAgeGroup} onValueChange={setAgeGroup}><Picker.Item label="U12" value="U12" /><Picker.Item label="U13" value="U13" /></Picker></View>
                <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={teamDivision} onValueChange={setDivision}><Picker.Item label="Div 1" value="Division 1" /><Picker.Item label="Div 2" value="Division 2" /></Picker></View>
            </View>

            <Text style={{fontWeight: 'bold', marginTop: 10, color: '#555', marginBottom: 5}}>Check Availability For:</Text>
            
            {/* FROM AND TO DATE INPUTS */}
            <View style={styles.row}>
              <View style={{flex: 1}}>
                  <Text style={{fontSize: 10, color: '#888', marginBottom: 2}}>From:</Text>
                  {Platform.OS === 'web' ? (
                     createElement('input', { type: 'date', value: startDateStr, onChange: (e) => setStartDateStr(e.target.value), style: styles.webDate })
                  ) : (
                     <TextInput style={styles.input} value={startDateStr} onChangeText={setStartDateStr} placeholder="YYYY-MM-DD" />
                  )}
              </View>
              <View style={{flex: 1}}>
                  <Text style={{fontSize: 10, color: '#888', marginBottom: 2}}>To:</Text>
                  {Platform.OS === 'web' ? (
                     createElement('input', { type: 'date', value: endDateStr, onChange: (e) => setEndDateStr(e.target.value), style: styles.webDate })
                  ) : (
                     <TextInput style={styles.input} value={endDateStr} onChangeText={setEndDateStr} placeholder="YYYY-MM-DD" />
                  )}
              </View>
            </View>

            {/* TIME INPUTS */}
            <View style={styles.row}>
                <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={startTime} onValueChange={setStartTime}>{timeOptions.map(t => <Picker.Item key={t} label={t} value={t} />)}</Picker></View>
                <View style={{justifyContent:'center'}}><Text>to</Text></View>
                <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={endTime} onValueChange={setEndTime}>{timeOptions.map(t => <Picker.Item key={t} label={t} value={t} />)}</Picker></View>
            </View>

            {/* WEEKENDS ONLY AND POSTAL CODE */}
            <View style={[styles.row, {marginTop: 10, alignItems: 'center'}]}>
                <Checkbox style={styles.checkbox} value={weekendsOnly} onValueChange={setWeekendsOnly} color={weekendsOnly ? '#1A73E8' : undefined} />
                <Text style={styles.checkLabel}>Weekends Only</Text>
            </View>

            <View style={[styles.row, {marginTop: 10}]}>
                <TextInput style={styles.input} value={teamPostalCode} onChangeText={(t) => setTeamPostalCode(t.toUpperCase())} maxLength={3} placeholder="Postal Code" />
                <TouchableOpacity style={styles.searchBtn} onPress={searchTeams}>
                    <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
            </View>
          </View>

          {loadingTeams ? <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 30}}/> : (
            <View style={{paddingBottom: 100}}>
                {teams.map((item) => (
                <View key={item.team_id} style={[styles.teamCard, { borderLeftColor: getStatusColor(item.calculated_status) }]}>
                    <View style={{flex: 1, marginLeft: 5}}>
                        <Text style={styles.teamName}>{item.team_name}</Text>
                        <Text style={{fontSize: 12, color: getStatusColor(item.calculated_status), fontWeight: 'bold', marginTop: 2}}>
                            ● {getStatusText(item.calculated_status)}
                        </Text>
                        <Text style={styles.distanceText}><Ionicons name="location" size={12}/> {item.distance_km ? item.distance_km.toFixed(1) : 0} km away</Text>
                    </View>
                    <TouchableOpacity style={styles.challengeBtn} onPress={() => handleChallengeClick(item)}>
                        <Text style={styles.challengeTxt}>Invite</Text>
                    </TouchableOpacity>
                </View>
                ))}
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
                  <Text style={{color: '#dc3545', fontWeight: 'bold', textAlign: 'center', marginTop: 10}}>No open fields found in this date range.</Text>
              </View>
            ) : (
              <>
                <Text style={{color: '#555', marginBottom: 15}}>Select booked fields to offer them:</Text>
                <FlatList 
                  data={myOpenMatches} 
                  keyExtractor={i => i.id.toString()} 
                  style={{maxHeight: 300}}
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
                <View style={{marginTop: 15}}>
                    <Text style={{fontWeight: 'bold', marginBottom: 5}}>Add a Note (Optional)</Text>
                    <TextInput 
                        style={{backgroundColor: '#F1F3F4', padding: 10, borderRadius: 8, height: 60}} 
                        placeholder="e.g. Can we split the cost 50/50?"
                        multiline
                        value={inviteNotes}
                        onChangeText={setInviteNotes}
                    />
                    <TouchableOpacity style={styles.confirmBtn} onPress={confirmChallenge}>
                        <Text style={styles.confirmTxt}>Send Invite ({selectedMatches.length * 30} mins)</Text>
                    </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  proCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, shadowColor: '#000', elevation: 3, marginBottom: 20 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  pickerWrapper: { flex: 1, backgroundColor: '#F1F3F4', borderRadius: 10, height: 45, justifyContent: 'center' },
  picker: { height: 45, borderWidth: 0, backgroundColor: 'transparent' },
  input: { flex: 1, backgroundColor: '#F1F3F4', paddingHorizontal: 15, borderRadius: 10, height: 45, fontWeight: '600' },
  webDate: { height: 45, borderRadius: 10, border: 'none', backgroundColor: '#F1F3F4', paddingHorizontal: 15, fontFamily: 'inherit', color: '#333' },
  checkbox: { width: 20, height: 20, borderRadius: 4, marginRight: 8 },
  checkLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  searchBtn: { backgroundColor: '#1A73E8', borderRadius: 10, justifyContent: 'center', paddingHorizontal: 20 },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },
  teamCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 12, alignItems: 'center', elevation: 2, borderLeftWidth: 6 },
  teamName: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  distanceText: { fontSize: 13, color: '#666', marginTop: 4 },
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
  confirmTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
