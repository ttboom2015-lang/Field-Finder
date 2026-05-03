import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lsquxrvufehselooyenj.supabase.co',
  'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'
);

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

  // Load existing team data when the screen opens
  useEffect(() => {
    const loadMyTeam = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("You must be logged in.");
            router.replace('/');
            return;
        }

        const response = await fetch(`http://localhost:3000/api/my-team?managerId=${user.id}`);
        const data = await response.json();

        if (data && data.id) {
            setTeamId(data.id);
            setTeamName(data.team_name);
            setSport(data.sport);
            setFormat(data.format);
            setAgeGroup(data.age_group);
            setDivision(data.division);
            setPostalCode(data.postal_code);
            setGender(data.gender);
        } else {
            alert("You haven't created a team yet!");
            router.replace('/create-team');
        }
      } catch (error) {
          console.error("Error loading team:", error);
      } finally {
          setLoading(false);
      }
    };
    loadMyTeam();
  }, []);

  const handleUpdateTeam = async () => {
    if (!teamName || !postalCode) {
      alert("Please fill in all required fields!");
      return;
    }
    
    try {
      const teamData = { teamId, teamName, sport, format, ageGroup, division, postalCode, gender };
      
      const response = await fetch('http://localhost:3000/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData),
      });

      if (response.ok) {
        alert(`Success! ${teamName} has been updated.`);
        router.back(); 
      } else {
        const result = await response.json();
        alert("Database Error: " + result.error);
      }
    } catch (error) {
      alert("Network Error: Could not connect to the backend server.");
    }
  };

  if (loading) {
      return <ActivityIndicator size="large" color="#007bff" style={{marginTop: 50}} />;
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Edit Team Profile</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Team / Academy Name *</Text>
        <TextInput style={styles.input} value={teamName} onChangeText={setTeamName} />

        <Text style={styles.label}>Sport</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={sport} onValueChange={setSport}>
            <Picker.Item label="Soccer" value="Soccer" />
            <Picker.Item label="Basketball" value="Basketball" />
          </Picker>
        </View>

        <Text style={styles.label}>Gender</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={gender} onValueChange={setGender}>
            <Picker.Item label="Boys" value="Boys" />
            <Picker.Item label="Girls" value="Girls" />
          </Picker>
        </View>

        <Text style={styles.label}>Match Format</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={format} onValueChange={setFormat}>
            <Picker.Item label="5v5" value="5v5" />
            <Picker.Item label="7v7" value="7v7" />
            <Picker.Item label="9v9" value="9v9" />
            <Picker.Item label="11v11" value="11v11" />
          </Picker>
        </View>

        <Text style={styles.label}>Age Group</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={ageGroup} onValueChange={setAgeGroup}>
            {ageGroups.map(age => <Picker.Item key={age} label={age} value={age} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Division / Level</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={division} onValueChange={setDivision}>
            <Picker.Item label="Division 1 (Competitive)" value="Division 1" />
            <Picker.Item label="Division 2 (Intermediate)" value="Division 2" />
            <Picker.Item label="Division 3 (Recreational)" value="Division 3" />
          </Picker>
        </View>

        <Text style={styles.label}>Home Postal Code *</Text>
        <TextInput style={styles.input} value={postalCode} onChangeText={(text) => setPostalCode(text.toUpperCase())} maxLength={3} />

        <TouchableOpacity style={styles.button} onPress={handleUpdateTeam}>
          <Text style={styles.buttonText}>Update Team Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f2f5' },
  backButton: { marginBottom: 10, marginTop: 10 },
  backButtonText: { color: '#007bff', fontSize: 16, fontWeight: 'bold' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333', textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, marginBottom: 40 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 8, marginTop: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, backgroundColor: '#f9f9f9', fontSize: 16 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#f9f9f9', overflow: 'hidden' },
  button: { backgroundColor: '#ffc107', padding: 15, borderRadius: 8, marginTop: 30, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 18 }
});