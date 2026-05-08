import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lsquxrvufehselooyenj.supabase.co',
  'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'
);

export default function AdminSetup() {
  const router = useRouter();
  const [clubName, setClubName] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [parkingInfo, setParkingInfo] = useState('');
  const [generalInfo, setGeneralInfo] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const checkExistingClub = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // Look for an existing field to grab the club details
      const { data: existingField } = await supabase.from('fields').select('*').eq('admin_id', user.id).limit(1).maybeSingle();
      
      if (existingField) {
        setIsEditing(true);
        setClubName(existingField.name); // Using first field name as club name fallback
        setAddress(existingField.address || '');
        setPostalCode(existingField.postal_code || '');
        setParkingInfo(existingField.parking_info || '');
        setGeneralInfo(existingField.general_info || '');
      }
      setLoading(false);
    };
    checkExistingClub();
  }, []);

  const handleSaveClub = async () => {
    if (!address || !postalCode) {
      alert("Please fill in Address and Postal Code.");
      return;
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (isEditing) {
        // Update ALL fields owned by this admin with the new club info
        await supabase.from('fields').update({
          address: address,
          postal_code: postalCode,
          parking_info: parkingInfo,
          general_info: generalInfo
        }).eq('admin_id', user.id);
        alert("Club Profile Updated!");
      } else {
        // Create initial placeholder field for new club
        await supabase.from('fields').insert([{
          admin_id: user.id, name: clubName || 'Main Facility', address: address, postal_code: postalCode,
          parking_info: parkingInfo, general_info: generalInfo, club_email: user.email
        }]);
        alert("Club Profile Created!");
      }
      router.replace('/admin-fields');
    } catch (error) {
      alert("Error saving club: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{marginTop: 50}}/>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>{isEditing ? 'Edit Club Info' : 'Set Up Your Facility'}</Text>
      {isEditing && (
        <TouchableOpacity onPress={() => router.replace('/admin-fields')} style={{marginBottom: 15}}>
          <Text style={{color: '#007bff', fontWeight: 'bold'}}>← Back to Fields</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.card}>
        {!isEditing && (
          <>
            <Text style={styles.label}>Facility / Club Name *</Text>
            <TextInput style={styles.input} value={clubName} onChangeText={setClubName} />
          </>
        )}

        <Text style={styles.label}>Address *</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="123 Main St" />

        <Text style={styles.label}>Postal Code *</Text>
        <TextInput style={styles.input} value={postalCode} onChangeText={(t) => setPostalCode(t.toUpperCase())} maxLength={3} placeholder="H2X" />

        <Text style={styles.label}>Parking Instructions</Text>
        <TextInput style={[styles.input, {height: 60}]} multiline value={parkingInfo} onChangeText={setParkingInfo} />

        <Text style={styles.label}>General Info / Rules</Text>
        <TextInput style={[styles.input, {height: 60}]} multiline value={generalInfo} onChangeText={setGeneralInfo} />

        <TouchableOpacity style={styles.btn} onPress={handleSaveClub}>
          <Text style={styles.btnText}>{isEditing ? 'Update Club Info' : 'Save & Continue'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f0f2f5', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '100%', maxWidth: 500, elevation: 3 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, backgroundColor: '#f9f9f9' },
  btn: { backgroundColor: '#28a745', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
