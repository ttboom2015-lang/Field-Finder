import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lsquxrvufehselooyenj.supabase.co',
  'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'
);

export default function Search() {
  const router = useRouter();
  const [myTeamId, setMyTeamId] = useState(null);
  
  // Dynamic Options from Database
  const [availableSports, setAvailableSports] = useState(['Soccer']);
  const [availableFormats, setAvailableFormats] = useState(['11v11']);

  // FIELD Filters
  const [fieldSport, setFieldSport] = useState('Soccer');
  const [fieldFormat, setFieldFormat] = useState('11v11');
  const [fieldStartDate, setFieldStartDate] = useState('2026-06-01');
  const [fieldEndDate, setFieldEndDate] = useState('2026-06-30');
  const [fieldPostalCode, setFieldPostalCode] = useState('H2X');

  // TEAM Filters
  const [teamSport, setTeamSport] = useState('Soccer');
  const [teamAgeGroup, setTeamAgeGroup] = useState('U12');
  const [teamDivision, setTeamDivision] = useState('Division 1');
  const [teamGender, setTeamGender] = useState('Boys');
  const [teamPostalCode, setTeamPostalCode] = useState('H2X');

  // Results & States
  const [fields, setFields] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [myOpenMatches, setMyOpenMatches] = useState([]);

  // Fetch logged-in user's team AND dynamic field options
  useFocusEffect(
    useCallback(() => {
      const initializeData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: teamData } = await supabase.from('teams').select('id').eq('manager_id', user.id).single();
          if (teamData) setMyTeamId(teamData.id);
        }

        const { data: fieldData } = await supabase.from('fields').select('sport, format');
        if (fieldData) {
          const uniqueSports = [...new Set(fieldData.map(f => f.sport))];
          const uniqueFormats = [...new Set(fieldData.map(f => f.format))];
          if (uniqueSports.length > 0) {
            setAvailableSports(uniqueSports);
            setFieldSport(uniqueSports[0]);
            setTeamSport(uniqueSports[0]);
          }
          if (uniqueFormats.length > 0) {
            setAvailableFormats(uniqueFormats);
            setFieldFormat(uniqueFormats[0]);
          }
        }
      };
      initializeData();
    }, [])
  );

  const searchFields = async () => {
    setLoadingFields(true);
    try {
      const fRes = await fetch(`http://localhost:3000/api/fields/available?sport=${fieldSport}&startDate=${fieldStartDate}&endDate=${fieldEndDate}&postalCode=${fieldPostalCode}`);
      const data = await fRes.json();
      const filteredData = data.filter(f => f.format === fieldFormat);
      setFields(filteredData);
    } catch (error) {
      alert("Error connecting to backend.");
    } finally {
      setLoadingFields(false);
    }
  };

  const searchTeams = async () => {
    setLoadingTeams(true);
    try {
      const dummyStart = '2026-01-01'; 
      const dummyEnd = '2026-12-31';
      const tRes = await fetch(`http://localhost:3000/api/teams/available?sport=${teamSport}&startDate=${dummyStart}&endDate=${dummyEnd}&postalCode=${teamPostalCode}&ageGroup=${teamAgeGroup}&division=${teamDivision}&gender=${teamGender}`);
      setTeams(await tRes.json());
    } catch (error) {
      alert("Error connecting to backend.");
    } finally {
      setLoadingTeams(false);
    }
  };

  const reserveField = async (field) => {
    if (!myTeamId) { alert("Create a team profile first!"); router.push('/create-team'); return; }
    try {
      const response = await fetch('http://localhost:3000/api/book-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilityId: field.availability_id, myTeamId: myTeamId, opponentTeamId: null })
      });
      if (response.ok) { alert("Field Reserved!"); searchFields(); } 
      else { const result = await response.json(); alert("Booking failed: " + result.error); }
    } catch (err) { alert("Network Error"); }
  };

  const handleChallengeClick = async (opponent) => {
    if (!myTeamId) { alert("Create a team profile first!"); return; }
    setSelectedOpponent(opponent);
    try {
      const response = await fetch(`http://localhost:3000/api/my-open-matches?myTeamId=${myTeamId}`);
      setMyOpenMatches(await response.json());
      setIsModalVisible(true);
    } catch (err) { alert("Error fetching your reservations."); }
  };

  const confirmChallenge = async (matchId) => {
    try {
      const response = await fetch('http://localhost:3000/api/add-opponent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: matchId, opponentTeamId: selectedOpponent.team_id })
      });
      if (response.ok) { alert("Success!"); setIsModalVisible(false); }
    } catch (err) { alert("Error adding opponent."); }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.navBar}>
        <Text style={styles.header}>Matchmaker</Text>
        <View style={{ flexDirection: 'row' }}>
          {/* NEW EDIT TEAM BUTTON */}
          <TouchableOpacity style={[styles.navBtn, {backgroundColor: '#ffc107'}]} onPress={() => router.push('/edit-team')}>
            <Text style={[styles.navTxt, {color: '#000'}]}>Edit Team</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/matches')}><Text style={styles.navTxt}>Matches</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.navBtn, {backgroundColor: '#dc3545'}]} onPress={() => router.replace('/')}><Text style={styles.navTxt}>Logout</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.splitContainer}>
        {/* LEFT COLUMN: FIELD SEARCH */}
        <View style={styles.column}>
          <Text style={styles.colHeader}>🏟️ Search Fields</Text>
          <View style={styles.filterCard}>
            <View style={styles.row}>
              <Picker style={styles.picker} selectedValue={fieldSport} onValueChange={setFieldSport}>
                {availableSports.map(s => <Picker.Item key={s} label={s} value={s} />)}
              </Picker>
              <Picker style={styles.picker} selectedValue={fieldFormat} onValueChange={setFieldFormat}>
                {availableFormats.map(f => <Picker.Item key={f} label={f} value={f} />)}
              </Picker>
            </View>
            <View style={styles.row}>
              <TextInput style={styles.input} value={fieldStartDate} onChangeText={setFieldStartDate} placeholder="Start Date" />
              <TextInput style={styles.input} value={fieldEndDate} onChangeText={setFieldEndDate} placeholder="End Date" />
            </View>
            <View style={styles.row}>
              <TextInput style={styles.input} value={fieldPostalCode} onChangeText={(t) => setFieldPostalCode(t.toUpperCase())} maxLength={3} placeholder="Postal Code" />
              <TouchableOpacity style={styles.searchBtn} onPress={searchFields}><Text style={styles.navTxt}>Find Fields</Text></TouchableOpacity>
            </View>
          </View>

          {loadingFields ? <ActivityIndicator size="large" color="#007bff" /> : (
            <FlatList data={fields} scrollEnabled={false} keyExtractor={i => i.availability_id.toString()} renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.title}>{item.field_name}</Text>
                <Text style={styles.details}>{item.distance_km ? item.distance_km.toFixed(1) : 0} km | {formatDate(item.start_time)}</Text>
                <TouchableOpacity style={styles.actionBtn} onPress={() => reserveField(item)}>
                  <Text style={styles.navTxt}>Reserve Field</Text>
                </TouchableOpacity>
              </View>
            )} />
          )}
        </View>

        {/* RIGHT COLUMN: TEAM SEARCH */}
        <View style={styles.column}>
          <Text style={styles.colHeader}>⚽ Search Opponents</Text>
          <View style={styles.filterCard}>
            <View style={styles.row}>
              <Picker style={styles.picker} selectedValue={teamSport} onValueChange={setTeamSport}>
                {availableSports.map(s => <Picker.Item key={s} label={s} value={s} />)}
              </Picker>
              <Picker style={styles.picker} selectedValue={teamGender} onValueChange={setTeamGender}>
                <Picker.Item label="Boys" value="Boys" />
                <Picker.Item label="Girls" value="Girls" />
              </Picker>
            </View>
            <View style={styles.row}>
              <Picker style={styles.picker} selectedValue={teamAgeGroup} onValueChange={setTeamAgeGroup}>
                <Picker.Item label="U12" value="U12" />
                <Picker.Item label="U13" value="U13" />
              </Picker>
              <Picker style={styles.picker} selectedValue={teamDivision} onValueChange={setTeamDivision}>
                <Picker.Item label="Div 1" value="Division 1" />
                <Picker.Item label="Div 2" value="Division 2" />
              </Picker>
            </View>
            <View style={styles.row}>
              <TextInput style={styles.input} value={teamPostalCode} onChangeText={(t) => setTeamPostalCode(t.toUpperCase())} maxLength={3} placeholder="Postal Code" />
              <TouchableOpacity style={[styles.searchBtn, {backgroundColor: '#17a2b8'}]} onPress={searchTeams}><Text style={styles.navTxt}>Find Teams</Text></TouchableOpacity>
            </View>
          </View>

          {loadingTeams ? <ActivityIndicator size="large" color="#17a2b8" /> : (
            <FlatList data={teams} scrollEnabled={false} keyExtractor={i => i.team_id.toString()} renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.title}>{item.team_name}</Text>
                <Text style={styles.details}>{item.distance_km ? item.distance_km.toFixed(1) : 0} km away</Text>
                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#17a2b8'}]} onPress={() => handleChallengeClick(item)}>
                  <Text style={styles.navTxt}>Challenge</Text>
                </TouchableOpacity>
              </View>
            )} />
          )}
        </View>
      </View>

      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Invite {selectedOpponent?.team_name}</Text>
            <Text style={{marginBottom: 15, color: '#555'}}>Select one of your reserved fields for this match:</Text>
            {myOpenMatches.length === 0 ? (
              <Text style={{color: 'red', fontWeight: 'bold', marginBottom: 20}}>You have no open fields. Reserve a field first!</Text>
            ) : (
              <FlatList data={myOpenMatches} keyExtractor={i => i.id.toString()} renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalFieldCard} onPress={() => confirmChallenge(item.id)}>
                  <Text style={{fontWeight: 'bold', fontSize: 16}}>{item.field_availabilities.fields.name}</Text>
                  <Text>{formatDate(item.field_availabilities.start_time)}</Text>
                </TouchableOpacity>
              )} />
            )}
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#6c757d', marginTop: 10}]} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.navTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f0f2f5' },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  header: { fontSize: 24, fontWeight: 'bold' },
  navBtn: { backgroundColor: '#6c757d', padding: 8, borderRadius: 5, marginLeft: 10 },
  navTxt: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  splitContainer: { flex: 1, flexDirection: 'row' },
  column: { flex: 1, backgroundColor: '#e9ecef', padding: 10, borderRadius: 8, marginHorizontal: 5 },
  colHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  filterCard: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 15, elevation: 2 },
  row: { flexDirection: 'row', marginBottom: 10 },
  picker: { flex: 1, borderWidth: 1, borderColor: '#ccc', marginHorizontal: 2, backgroundColor: '#f9f9f9' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 10, marginHorizontal: 2, borderRadius: 5, backgroundColor: '#f9f9f9' },
  searchBtn: { flex: 1, backgroundColor: '#007bff', padding: 10, marginHorizontal: 2, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  details: { fontSize: 14, color: '#666' },
  actionBtn: { backgroundColor: '#28a745', padding: 10, borderRadius: 5, marginTop: 10, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%', maxHeight: '80%' },
  modalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  modalFieldCard: { backgroundColor: '#e9ecef', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#ccc' }
});