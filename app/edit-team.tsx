import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');

export default function EditTeam() {
  const router = useRouter();
  const [teamId, setTeamId] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [sport, setSport] = useState('Soccer'); 
  const [format, setFormat] = useState('11v11');
  const [ageGroup, setAgeGroup] = useState('U12');
  const [division, setDivision] = useState('Division 1');
  const [postalCode, setPostalCode] = useState('');
  const [gender, setGender] = useState('Boys');
  const [loading, setLoading] = useState(true);

  const ageGroups = Array.from({ length: 15 }, (_, i) => `U${i + 7}`);

  useEffect(() => {
    const loadMyTeam = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace('/'); return; }
        const response = await fetch(`http://localhost:3000/api/my-team?managerId=${user.id}`);
        const data = await response.json();
        
        if (data && data.id) {
            setTeamId(data.id); setTeamName(data.team_name); setSport(data.sport); setFormat(data.format);
            setAgeGroup(data.age_group); setDivision(data.division); setPostalCode(data.postal_code); setGender(data.gender);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    loadMyTeam();
  }, []);

  const handleUpdateTeam = async () => {
    if (!teamName || !postalCode) { alert("Please fill in required fields!"); return; }
    try {
      const response = await fetch('http://localhost:3000/api/teams', {
        method: teamId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, teamName, sport, format, ageGroup, division, postalCode, gender, manager_id: (await supabase.auth.getUser()).data.user.id }),
      });
      if (response.ok) { alert(`Success! Profile saved.`); router.back(); } 
      else { const res = await response.json(); alert("Error: " + res.error); }
    } catch (error) { alert("Network Error"); }
  };

  if (loading) return <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 50}} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{teamId ? 'Edit Team' : 'Create Team'}</Text>
        <View style={{width: 40}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.label}>Team / Academy Name *</Text>
          <TextInput style={styles.input} value={teamName} onChangeText={setTeamName} placeholder="e.g. Lions FC" />

          <View style={styles.row}>
              <View style={{flex: 1}}>
                  <Text style={styles.label}>Sport</Text>
                  <View style={styles.pickerWrapper}><Picker selectedValue={sport} onValueChange={setSport}><Picker.Item label="Soccer" value="Soccer" /><Picker.Item label="Basketball" value="Basketball" /></Picker></View>
              </View>
              <View style={{flex: 1}}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.pickerWrapper}><Picker selectedValue={gender} onValueChange={setGender}><Picker.Item label="Boys" value="Boys" /><Picker.Item label="Girls" value="Girls" /></Picker></View>
              </View>
          </View>

          <Text style={styles.label}>Match Format</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={format} onValueChange={setFormat}>
              <Picker.Item label="5v5" value="5v5" /><Picker.Item label="7v7" value="7v7" />
              <Picker.Item label="9v9" value="9v9" /><Picker.Item label="11v11" value="11v11" />
            </Picker>
          </View>

          <View style={styles.row}>
              <View style={{flex: 1}}>
                  <Text style={styles.label}>Age</Text>
                  <View style={styles.pickerWrapper}><Picker selectedValue={ageGroup} onValueChange={setAgeGroup}>{ageGroups.map(age => <Picker.Item key={age} label={age} value={age} />)}</Picker></View>
              </View>
              <View style={{flex: 1}}>
                  <Text style={styles.label}>Division</Text>
                  <View style={styles.pickerWrapper}><Picker selectedValue={division} onValueChange={setDivision}><Picker.Item label="Div 1" value="Division 1" /><Picker.Item label="Div 2" value="Division 2" /><Picker.Item label="Div 3" value="Division 3" /></Picker></View>
              </View>
          </View>

          <Text style={styles.label}>Home Postal Code *</Text>
          <TextInput style={styles.input} value={postalCode} onChangeText={(text) => setPostalCode(text.toUpperCase())} maxLength={3} placeholder="H2X" />

          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateTeam}>
            <Text style={styles.saveBtnTxt}>Save Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111' },

  container: { padding: 20, paddingBottom: 50 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  row: { flexDirection: 'row', gap: 15 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#F1F3F4', padding: 15, borderRadius: 10, fontSize: 16, fontWeight: '500', color: '#333' },
  pickerWrapper: { backgroundColor: '#F1F3F4', borderRadius: 10, overflow: 'hidden', height: 50, justifyContent: 'center' },
  saveBtn: { backgroundColor: '#1A73E8', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  saveBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
