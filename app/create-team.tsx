import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

const supabase = createClient(
  'https://lsquxrvufehselooyenj.supabase.co',
  'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'
);

export default function CreateTeam() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Core Team Info
  const [teamName, setTeamName] = useState('');
  const [sport, setSport] = useState('Soccer'); 
  const [ageGroup, setAgeGroup] = useState('U12');
  const [division, setDivision] = useState('Division 1');
  const [gender, setGender] = useState('Boys');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Staff Info
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState(''); 
  const [managerPhone, setManagerPhone] = useState('');
  
  const [hcName, setHcName] = useState(''); const [hcEmail, setHcEmail] = useState(''); const [hcPhone, setHcPhone] = useState('');
  const [ac1Name, setAc1Name] = useState(''); const [ac1Email, setAc1Email] = useState(''); const [ac1Phone, setAc1Phone] = useState('');
  const [ac2Name, setAc2Name] = useState(''); const [ac2Email, setAc2Email] = useState(''); const [ac2Phone, setAc2Phone] = useState('');

  const ageGroups = Array.from({ length: 15 }, (_, i) => `U${i + 7}`);

  // Automatically grab the logged-in user's email for the Manager Email field
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setManagerEmail(user.email);
      setInitializing(false);
    };
    fetchUser();
  }, []);

  const handleCreateTeam = async () => {
    if (!teamName || !address || !postalCode || !managerName) { 
        alert("Please fill in Team Name, Manager Name, Address, and Postal Code!"); 
        return; 
    }
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { 
          teamName, sport, ageGroup, division, address, postalCode, gender, manager_id: user.id,
          managerName, managerPhone, hcName, hcEmail, hcPhone, ac1Name, ac1Email, ac1Phone, ac2Name, ac2Email, ac2Phone 
      };

      // NOTE: Change localhost to your IP if testing on a physical mobile device!
      const response = await fetch('http://localhost:3000/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) { 
          alert(`Success! Team Profile created.`); 
          router.replace('/search'); // Send them to the dashboard!
      } else { 
          const res = await response.json(); 
          alert("Error: " + res.error); 
      }
    } catch (error) { 
        alert("Network Error: Could not connect to backend."); 
    } finally {
        setLoading(false);
    }
  };

  if (initializing) return <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 50}} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Your Team</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={{color: '#dc3545', fontWeight: 'bold'}}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        {/* --- TEAM INFO --- */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>⚽ Team Information</Text>
          <Text style={styles.label}>Team / Academy Name *</Text>
          <TextInput style={styles.input} value={teamName} onChangeText={setTeamName} placeholder="e.g. Lions FC" />

          <View style={styles.row}>
              <View style={{flex: 1}}>
                  <Text style={styles.label}>Sport</Text>
                  <View style={styles.pickerWrapper}>
                      <Picker selectedValue={sport} onValueChange={setSport}>
                          <Picker.Item label="Soccer" value="Soccer" />
                          <Picker.Item label="Basketball" value="Basketball" />
                          <Picker.Item label="Tennis" value="Tennis" />
                          <Picker.Item label="Hockey" value="Hockey" />
                          <Picker.Item label="Baseball" value="Baseball" />
                      </Picker>
                  </View>
              </View>
              <View style={{flex: 1}}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.pickerWrapper}>
                      <Picker selectedValue={gender} onValueChange={setGender}>
                          <Picker.Item label="Boys" value="Boys" />
                          <Picker.Item label="Girls" value="Girls" />
                      </Picker>
                  </View>
              </View>
          </View>

          <View style={styles.row}>
              <View style={{flex: 1}}>
                  <Text style={styles.label}>Age Group</Text>
                  <View style={styles.pickerWrapper}>
                      <Picker selectedValue={ageGroup} onValueChange={setAgeGroup}>
                          {ageGroups.map(age => <Picker.Item key={age} label={age} value={age} />)}
                      </Picker>
                  </View>
              </View>
              <View style={{flex: 1}}>
                  <Text style={styles.label}>Division</Text>
                  <View style={styles.pickerWrapper}>
                      <Picker selectedValue={division} onValueChange={setDivision}>
                          <Picker.Item label="Div 1" value="Division 1" />
                          <Picker.Item label="Div 2" value="Division 2" />
                          <Picker.Item label="Div 3" value="Division 3" />
                      </Picker>
                  </View>
              </View>
          </View>

          <Text style={styles.label}>Home Address *</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="e.g. 123 Main St" />
          
          <Text style={styles.label}>Postal Code *</Text>
          <TextInput style={styles.input} value={postalCode} onChangeText={(text) => setPostalCode(text.toUpperCase())} maxLength={3} placeholder="e.g. H2X" />
        </View>

        {/* --- MANAGER INFO --- */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>👤 Manager Information</Text>
          <Text style={styles.label}>Manager Name *</Text>
          <TextInput style={styles.input} value={managerName} onChangeText={setManagerName} placeholder="Your full name" />
          
          <Text style={styles.label}>Email Address (Read-only)</Text>
          <TextInput style={[styles.input, {backgroundColor: '#e9ecef', color: '#666'}]} value={managerEmail} editable={false} />
          
          <Text style={styles.label}>Phone Number</Text>
          <TextInput style={styles.input} value={managerPhone} onChangeText={setManagerPhone} keyboardType="phone-pad" placeholder="(555) 000-0000" />
        </View>

        {/* --- STAFF INFO --- */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>📋 Coaching Staff (Optional)</Text>
          <Text style={{fontSize: 12, color: '#666', marginBottom: 15}}>Note: Staff must create their own accounts to access the portal. You can approve them in the Roster tab later.</Text>
          
          <Text style={styles.label}>Head Coach Name</Text>
          <TextInput style={styles.input} value={hcName} onChangeText={setHcName} placeholder="Name" />
          <View style={styles.row}>
              <TextInput style={[styles.input, {flex: 1}]} value={hcEmail} onChangeText={setHcEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none"/>
              <TextInput style={[styles.input, {flex: 1}]} value={hcPhone} onChangeText={setHcPhone} placeholder="Phone" keyboardType="phone-pad" />
          </View>

          <Text style={styles.label}>Assistant Coach 1</Text>
          <TextInput style={styles.input} value={ac1Name} onChangeText={setAc1Name} placeholder="Name" />
          <View style={styles.row}>
              <TextInput style={[styles.input, {flex: 1}]} value={ac1Email} onChangeText={setAc1Email} placeholder="Email" autoCapitalize="none"/>
              <TextInput style={[styles.input, {flex: 1}]} value={ac1Phone} onChangeText={setAc1Phone} placeholder="Phone" />
          </View>

          <Text style={styles.label}>Assistant Coach 2</Text>
          <TextInput style={styles.input} value={ac2Name} onChangeText={setAc2Name} placeholder="Name" />
          <View style={styles.row}>
              <TextInput style={[styles.input, {flex: 1}]} value={ac2Email} onChangeText={setAc2Email} placeholder="Email" autoCapitalize="none"/>
              <TextInput style={[styles.input, {flex: 1}]} value={ac2Phone} onChangeText={setAc2Phone} placeholder="Phone" />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleCreateTeam} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnTxt}>Create Team Profile</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  container: { padding: 20, paddingBottom: 50 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#1A73E8', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 15, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 10, fontSize: 15, fontWeight: '500', color: '#333', marginBottom: 5 },
  pickerWrapper: { backgroundColor: '#F1F3F4', borderRadius: 10, overflow: 'hidden', height: 50, justifyContent: 'center' },
  saveBtn: { backgroundColor: '#1A73E8', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
