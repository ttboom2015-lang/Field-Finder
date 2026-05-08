import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Modal, SafeAreaView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');

export default function TeamFinder() {
  const router = useRouter();
  const [myTeamId, setMyTeamId] = useState(null);
  
  const [teamSport, setTeamSport] = useState('Soccer');
  const [teamAgeGroup, setTeamAgeGroup] = useState('U12');
  const [teamDivision, setTeamDivision] = useState('Division 1');
  const [teamGender, setTeamGender] = useState('Boys');
  const [teamPostalCode, setTeamPostalCode] = useState('H2X');
  
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [myOpenMatches, setMyOpenMatches] = useState([]);
  const [selectedMatches, setSelectedMatches] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const initializeData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: teamData } = await supabase.from('teams').select('id').eq('manager_id', user.id).single();
          if (teamData) setMyTeamId(teamData.id);
        }
      };
      initializeData();
    }, [])
  );

  const searchTeams = async () => {
    setLoadingTeams(true);
    try {
      const tRes = await fetch(`http://localhost:3000/api/teams/available?sport=${teamSport}&startDate=2026-01-01&endDate=2026-12-31&postalCode=${teamPostalCode}&ageGroup=${teamAgeGroup}&division=${teamDivision}&gender=${teamGender}`);
      setTeams(await tRes.json());
    } catch (error) { alert("Error connecting to backend."); } finally { setLoadingTeams(false); }
  };

  const handleChallengeClick = async (opponent) => {
    if (!myTeamId) { alert("Create a team profile first!"); return; }
    setSelectedOpponent(opponent);
    setSelectedMatches([]); 
    
    try {
      const response = await fetch(`http://localhost:3000/api/my-open-matches?myTeamId=${myTeamId}`);
      setMyOpenMatches(await response.json());
      setIsModalVisible(true);
    } catch (err) { alert("Error fetching your reservations."); }
  };

  const toggleMatchSelection = (matchId) => {
      if (selectedMatches.includes(matchId)) setSelectedMatches(selectedMatches.filter(id => id !== matchId));
      else setSelectedMatches([...selectedMatches, matchId]);
  };

  const confirmChallenge = async () => {
    if (selectedMatches.length === 0) return;
    try {
      const response = await fetch('http://localhost:3000/api/add-opponent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchIds: selectedMatches, opponentTeamId: selectedOpponent.team_id, myTeamId: myTeamId })
      });
      if (response.ok) { 
        alert(`Success! Invite sent to ${selectedOpponent.team_name}.`); 
        setIsModalVisible(false); 
      } else {
        const result = await response.json(); alert("Error: " + result.error);
      }
    } catch (err) { alert("Network Error"); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/search')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Find Opponent</Text>
        <View style={{width: 40}} /> 
      </View>

      <View style={{padding: 20}}>
          <View style={styles.proCard}>
            <View style={styles.row}>
                <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={teamSport} onValueChange={setTeamSport}><Picker.Item label="Soccer" value="Soccer" /><Picker.Item label="Basketball" value="Basketball" /></Picker></View>
                <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={teamGender} onValueChange={setTeamGender}><Picker.Item label="Boys" value="Boys" /><Picker.Item label="Girls" value="Girls" /></Picker></View>
            </View>
            <View style={styles.row}>
                <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={teamAgeGroup} onValueChange={setTeamAgeGroup}><Picker.Item label="U12" value="U12" /><Picker.Item label="U13" value="U13" /></Picker></View>
                <View style={styles.pickerWrapper}><Picker style={styles.picker} selectedValue={teamDivision} onValueChange={setTeamDivision}><Picker.Item label="Div 1" value="Division 1" /><Picker.Item label="Div 2" value="Division 2" /></Picker></View>
            </View>
            <View style={styles.row}>
                <TextInput style={styles.input} value={teamPostalCode} onChangeText={(t) => setTeamPostalCode(t.toUpperCase())} maxLength={3} placeholder="Postal Code" />
                <TouchableOpacity style={styles.searchBtn} onPress={searchTeams}>
                    <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
            </View>
          </View>

          {loadingTeams ? <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 30}}/> : (
            <FlatList 
                data={teams} 
                keyExtractor={i => i.team_id.toString()} 
                contentContainerStyle={{paddingBottom: 150}}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                <View style={styles.teamCard}>
                    <View style={styles.avatar}><Ionicons name="shield-outline" size={24} color="#1A73E8"/></View>
                    <View style={{flex: 1, marginLeft: 15}}>
                        <Text style={styles.teamName}>{item.team_name}</Text>
                        <Text style={styles.distanceText}><Ionicons name="location" size={12}/> {item.distance_km ? item.distance_km.toFixed(1) : 0} km away</Text>
                    </View>
                    <TouchableOpacity style={styles.challengeBtn} onPress={() => handleChallengeClick(item)}>
                        <Text style={styles.challengeTxt}>Invite</Text>
                    </TouchableOpacity>
                </View>
            )} />
          )}
      </View>

      {/* MODAL */}
      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invite {selectedOpponent?.team_name}</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}><Ionicons name="close" size={28} color="#888"/></TouchableOpacity>
            </View>
            
            <Text style={{color: '#555', marginBottom: 15}}>Select the field slots you want to offer them:</Text>
            
            {myOpenMatches.length === 0 ? (
              <Text style={{color: '#dc3545', fontWeight: 'bold'}}>You have no open fields. Go back and reserve a field first!</Text>
            ) : (
              <FlatList 
                data={myOpenMatches} 
                keyExtractor={i => i.id.toString()} 
                style={{maxHeight: 300}}
                renderItem={({ item }) => {
                  const isSelected = selectedMatches.includes(item.id);
                  const d = new Date(item.field_availabilities.start_time);
                  return (
                    <TouchableOpacity style={[styles.modalSlot, isSelected && styles.modalSlotSelected]} onPress={() => toggleMatchSelection(item.id)}>
                      <Text style={[styles.slotName, isSelected && {color: '#fff'}]}>{item.field_availabilities.fields.name}</Text>
                      <Text style={[styles.slotDetails, isSelected && {color: '#fff'}]}>
                        {d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })} • {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                    </TouchableOpacity>
                  );
                }} 
              />
            )}
            
            {selectedMatches.length > 0 && (
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmChallenge}>
                    <Text style={styles.confirmTxt}>Send Invite ({selectedMatches.length * 30} mins)</Text>
                </TouchableOpacity>
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

  proCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 20 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  pickerWrapper: { flex: 1, backgroundColor: '#F1F3F4', borderRadius: 10, height: 45, justifyContent: 'center' },
  picker: { height: 45, borderWidth: 0, backgroundColor: 'transparent' },
  input: { flex: 1, backgroundColor: '#F1F3F4', paddingHorizontal: 15, borderRadius: 10, height: 45, fontWeight: '600' },
  searchBtn: { backgroundColor: '#1A73E8', borderRadius: 10, justifyContent: 'center', paddingHorizontal: 20 },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },

  teamCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  teamName: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  distanceText: { fontSize: 13, color: '#666', marginTop: 4 },
  challengeBtn: { backgroundColor: '#E8F0FE', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  challengeTxt: { color: '#1A73E8', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalSlot: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  modalSlotSelected: { backgroundColor: '#1A73E8', borderColor: '#1A73E8' },
  slotName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  slotDetails: { fontSize: 14, color: '#666', marginTop: 4 },
  confirmBtn: { backgroundColor: '#1A73E8', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  confirmTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
