import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';

export default function CreateTeam() {
  const router = useRouter();
  
  // Form State
  const [teamName, setTeamName] = useState('');
  const [sport, setSport] = useState('Soccer'); // <-- NEW: Sport State
  const [format, setFormat] = useState('11v11');
  const [ageGroup, setAgeGroup] = useState('U12');
  const [division, setDivision] = useState('Division 1');
  const [postalCode, setPostalCode] = useState('');

  // Generate Age Groups U7 to U21
  const ageGroups = Array.from({ length: 15 }, (_, i) => `U${i + 7}`);

  const handleSaveTeam = async () => {
    if (!teamName || !postalCode) {
      alert("Please fill in all required fields!");
      return;
    }
    
    const teamData = { teamName, sport, format, ageGroup, division, postalCode };
    
    try {
      // Send the data to your Node.js Backend
      const response = await fetch('http://localhost:3000/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Success! ${teamName} has been saved to the database.`);
        router.back(); // Go back to home page
      } else {
        alert("Database Error: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Network Error: Could not connect to the backend server.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Create a New Team</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Team / Academy Name *</Text>
        <TextInput 
          style={styles.input} 
          value={teamName} 
          onChangeText={setTeamName} 
          placeholder="e.g., Montreal Impact Academy" 
        />

        {/* NEW: Sport Dropdown */}
        <Text style={styles.label}>Sport</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={sport} onValueChange={setSport}>
            <Picker.Item label="Soccer" value="Soccer" />
            <Picker.Item label="Basketball" value="Basketball" />
            <Picker.Item label="Handball" value="Handball" />
            <Picker.Item label="Hockey" value="Hockey" />
            <Picker.Item label="Baseball" value="Baseball" />
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
            {ageGroups.map(age => (
              <Picker.Item key={age} label={age} value={age} />
            ))}
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

        <Text style={styles.label}>Home Postal Code (First 3 Letters) *</Text>
        <TextInput 
          style={styles.input} 
          value={postalCode} 
          onChangeText={(text) => setPostalCode(text.toUpperCase())} 
          placeholder="e.g., H2X" 
          maxLength={3}
        />

        <TouchableOpacity style={styles.button} onPress={handleSaveTeam}>
          <Text style={styles.buttonText}>Save Team Profile</Text>
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
  button: { backgroundColor: '#28a745', padding: 15, borderRadius: 8, marginTop: 30, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});