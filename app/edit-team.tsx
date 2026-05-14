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

export default function EditTeam() {
  const router = useRouter();
  const [teamId, setTeamId] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let isMounted = true; // Prevents memory leaks if the user navigates away fast

    const loadMyTeam = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) { 
            alert("Authentication error. Please log in again.");
            router.replace('/'); 
            return; 
        }
        
        if (isMounted) setManagerEmail(user.email); 

        // CRITICAL: Replace localhost with your IP if you are testing on a mobile device!
        const response = await fetch(`https://fieldfinder-api.onrender.com/api/my-team?managerId=${user.id}`);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.id && isMounted) {
            setTeamId(data.id); 
            setTeamName(data.team_name || ''); 
            setSport(data.sport || 'Soccer'); 
            setAgeGroup(data.age_group || 'U12'); 
            setDivision(data.division || 'Division 1'); 
            setGender(data.gender || 'Boys');
            setAddress(data.address || ''); 
            setPostalCode(data.postal_code || '');
            setManagerName(data.manager_name || ''); 
            setManagerPhone(data.manager_phone || '');
            setHcName(data.hc_name || ''); setHcEmail(data.hc_email || ''); setHcPhone(data.hc_phone || '');
            setAc1Name(data.ac1_name || ''); setAc1Email(data.ac1_email || ''); setAc1Phone(data.ac1_phone || '');
            setAc2Name(data.ac2_name || ''); setAc2Email(data.ac2_email || ''); setAc2Phone(data.ac2_phone || '');
        } else {
            // If they somehow got here without a team, send them to create it
            alert("No team profile found. Redirecting to setup.");
            router.replace('/create-team');
        }
      } catch (error) { 
        console.error("Load Team Error:", error);
        alert("Failed to load your team data. Are you sure your backend server is running?"); 
      } finally { 
        if (isMounted) setLoading(false); 
      }
    };

    loadMyTeam();

    return () => { isMounted = false; };
  }, []);

  const handleUpdateTeam = async () => {
    if (!teamName || !address || !postalCode || !managerName) { 
        alert("Please fill in Team Name, Manager Name, Address, and Postal Code!"); 
        return; 
    }
    
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { 
          teamId, teamName, sport, ageGroup, division, address, postalCode, gender, manager_id: user.id,
          managerName, managerPhone, hcName, hcEmail, hcPhone, ac1Name, ac1Email, ac1Phone, ac2Name, ac2Email, ac2Phone 
      };

      const response = await fetch('https://fieldfinder-api.onrender.com/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) { 
          alert(`Success! Profile saved.`); 
          router.replace('/search'); 
      } else { 
          const res = await response.json(); 
          alert("Error: " + res.error); 
      }
    } catch (error) { 
        alert("Network Error: Could not connect to backend server."); 
    } finally {
        setLoading(false);
    }
  };

  // --- SAFE LOADING STATE ---
  if (loading) {
      return (
        <SafeAreaView style={[styles.safeArea, {justifyContent: 'center', alignItems: 'center'}]}>
            <ActivityIndicator size="large" color="#1A73E8" />
            <Text style={{marginTop: 15, color: '#666', fontWeight: 'bold'}}>Loading your team profile...</Text>
        </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Team Profile</Text>
        <View style={{width: 40}} /> 
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
          
          <Text style={styles.label}>Head Coach</Text>
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

        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateTeam}>
          <Text style={styles.saveBtnTxt}>Update Profile</Text>
        </TouchableOpacity>

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
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#1A73E8', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 15, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 10, fontSize: 15, fontWeight: '500', color: '#333', marginBottom: 5 },
  pickerWrapper: { backgroundColor: '#F1F3F4', borderRadius: 10, overflow: 'hidden', height: 50, justifyContent: 'center' },
  saveBtn: { backgroundColor: '#1A73E8', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
