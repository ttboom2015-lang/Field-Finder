import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';

export default function Search() {
  const router = useRouter();
  const myDummyTeamId = '99999999-9999-9999-9999-999999999999';
  
  // Filters
  const [sport, setSport] = useState('Soccer');
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-06-30');
  const [myPostalCode, setMyPostalCode] = useState('H2X');
  const [ageGroup, setAgeGroup] = useState('U12');
  const [division, setDivision] = useState('Division 1');
  const [gender, setGender] = useState('Boys');

  // Results & States
  const [fields, setFields] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [myOpenMatches, setMyOpenMatches] = useState([]);

  const searchEverything = async () => {
    setLoading(true);
    try {
      const fRes = await fetch(`http://localhost:3000/api/fields/available?sport=${sport}&startDate=${startDate}&endDate=${endDate}&postalCode=${myPostalCode}`);
      setFields(await fRes.json());

      const tRes = await fetch(`http://localhost:3000/api/teams/available?sport=${sport}&startDate=${startDate}&endDate=${endDate}&postalCode=${myPostalCode}&ageGroup=${ageGroup}&division=${division}&gender=${gender}`);
      setTeams(await tRes.json());
    } catch (error) {
      alert("Error connecting to backend.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Reserve Field (Just for me, no opponent yet)
  const reserveField = async (field) => {
    try {
      const response = await fetch('http://localhost:3000/api/book-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availabilityId: field.availability_id,
          myTeamId: myDummyTeamId,
          opponentTeamId: null // Leaving this blank!
        })
      });
      if (response.ok) {
        alert("Field Reserved! You can now invite an opponent to it.");
        searchEverything();
      } else {
        const result = await response.json();
        alert("Booking failed: " + result.error);
      }
    } catch (err) { alert("Network Error"); }
  };

  // 2. Click Opponent -> Fetch my open fields and show Modal
  const handleChallengeClick = async (opponent) => {
    setSelectedOpponent(opponent);
    try {
      const response = await fetch(`http://localhost:3000/api/my-open-matches?myTeamId=${myDummyTeamId}`);
      const data = await response.json();
      setMyOpenMatches(data);
      setIsModalVisible(true);
    } catch (err) {
      alert("Error fetching your reservations.");
    }
  };

  // 3. Select Field in Modal -> Add Opponent to Database
  const confirmChallenge = async (matchId) => {
    try {
      const response = await fetch('http://localhost:3000/api/add-opponent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: matchId, opponentTeamId: selectedOpponent.team_id })
      });
      if (response.ok) {
        alert(`Success! ${selectedOpponent.team_name} has been added to your reservation.`);
        setIsModalVisible(false);
      }
    } catch (err) { alert("Error adding opponent."); }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <Text style={styles.header}>Matchmaker</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/matches')}><Text style={styles.navTxt}>View Matches</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.navBtn, {backgroundColor: '#dc3545'}]} onPress={() => router.replace('/')}><Text style={styles.navTxt}>Logout</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterCard}>
        <View style={styles.row}>
          <Picker style={styles.picker} selectedValue={sport} onValueChange={setSport}><Picker.Item label="Soccer" value="Soccer" /></Picker>
          <Picker style={styles.picker} selectedValue={gender} onValueChange={setGender}><Picker.Item label="Boys" value="Boys" /></Picker>
          <Picker style={styles.picker} selectedValue={ageGroup} onValueChange={setAgeGroup}><Picker.Item label="U12" value="U12" /></Picker>
          <Picker style={styles.picker} selectedValue={division} onValueChange={setDivision}><Picker.Item label="Div 1" value="Division 1" /></Picker>
        </View>
        <View style={styles.row}>
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} />
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} />
          <TextInput style={styles.input} value={myPostalCode} onChangeText={(t) => setMyPostalCode(t.toUpperCase())} maxLength={3} />
          <TouchableOpacity style={styles.searchBtn} onPress={searchEverything}><Text style={{color: '#fff', fontWeight: 'bold'}}>Search</Text></TouchableOpacity>
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color="#007bff" style={{marginTop: 20}} /> : (
        <View style={styles.splitContainer}>
          {/* Fields */}
          <View style={styles.column}>
            <Text style={styles.colHeader}>🏟️ Fields</Text>
            <FlatList data={fields} keyExtractor={i => i.availability_id.toString()} renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={styles.title}>{item.field_name}</Text>
                  <Text style={styles.details}>{item.distance_km.toFixed(1)} km | {formatDate(item.start_time)}</Text>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => reserveField(item)}>
                    <Text style={styles.navTxt}>Reserve Field</Text>
                  </TouchableOpacity>
                </View>
              )} />
          </View>

          {/* Opponents */}
          <View style={styles.column}>
            <Text style={styles.colHeader}>⚽ Opponents</Text>
            <FlatList data={teams} keyExtractor={i => i.availability_id.toString()} renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={styles.title}>{item.team_name}</Text>
                  <Text style={styles.details}>{item.distance_km.toFixed(1)} km away</Text>
                  <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#17a2b8'}]} onPress={() => handleChallengeClick(item)}>
                    <Text style={styles.navTxt}>Challenge</Text>
                  </TouchableOpacity>
                </View>
              )} />
          </View>
        </View>
      )}

      {/* POP-UP MODAL: Select which field to invite them to */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f0f2f5' },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  header: { fontSize: 24, fontWeight: 'bold' },
  navBtn: { backgroundColor: '#6c757d', padding: 8, borderRadius: 5, marginLeft: 10 },
  navTxt: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  filterCard: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 10, elevation: 2 },
  row: { flexDirection: 'row', marginBottom: 10 },
  picker: { flex: 1, borderWidth: 1, borderColor: '#ccc', marginHorizontal: 2, backgroundColor: '#f9f9f9' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 10, marginHorizontal: 2, borderRadius: 5, backgroundColor: '#f9f9f9' },
  searchBtn: { flex: 1, backgroundColor: '#007bff', padding: 10, marginHorizontal: 2, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  splitContainer: { flex: 1, flexDirection: 'row' },
  column: { flex: 1, backgroundColor: '#e9ecef', padding: 10, borderRadius: 8, marginHorizontal: 5 },
  colHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  details: { fontSize: 14, color: '#666' },
  actionBtn: { backgroundColor: '#28a745', padding: 10, borderRadius: 5, marginTop: 10, alignItems: 'center' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%', maxHeight: '80%' },
  modalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  modalFieldCard: { backgroundColor: '#e9ecef', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#ccc' }
});