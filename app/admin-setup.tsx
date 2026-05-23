import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import FreeAddressPicker from '../components/FreeAddressPicker';

const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');

export default function AdminSetup() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [facilityId, setFacilityId] = useState(null);

  // Facility States
  const [complexName, setComplexName] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [parkingInfo, setParkingInfo] = useState('');
  const [generalInfo, setGeneralInfo] = useState('');

  useEffect(() => {
    const checkFacility = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: facility } = await supabase
        .from('facilities')
        .select('*')
        .eq('admin_id', user.id)
        .maybeSingle();
      
      if (facility) {
        setIsEditing(true);
        setFacilityId(facility.id);
        setComplexName(facility.name);
        setAddress(facility.address || '');
        setPostalCode(facility.postal_code || '');
        setParkingInfo(facility.parking_info || '');
        setGeneralInfo(facility.general_info || '');
      }
      setLoading(false);
    };
    checkFacility();
  }, []);

  const handleSaveFacility = async () => {
    if (!address || !postalCode || !complexName) { alert("Please fill in Name, Address, and Postal Code."); return; }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
          name: complexName, address, postal_code: postalCode, 
          parking_info: parkingInfo, general_info: generalInfo, 
          contact_email: user.email
      };

      if (isEditing) {
        await supabase.from('facilities').update(payload).eq('id', facilityId);
        alert("Complex Profile Updated!");
      } else {
        await supabase.from('facilities').insert([{ ...payload, admin_id: user.id }]);
        alert("Complex Created! Now you can add fields.");
      }
      router.replace('/admin-fields'); 
    } catch (error) { alert("Error saving: " + error.message); } finally { setLoading(false); }
  };

  if (loading) return <ActivityIndicator size="large" style={{marginTop: 50}}/>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>{isEditing ? 'Edit Complex Info' : 'Set Up Your Complex'}</Text>
        {isEditing && (
          <TouchableOpacity onPress={() => router.replace('/admin-fields')} style={{marginBottom: 15}}>
            <Text style={{color: '#007bff', fontWeight: 'bold'}}>← Back to Fields</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.card}>
          <Text style={styles.label}>Complex / Facility Name *</Text>
          <TextInput style={styles.input} value={complexName} onChangeText={setComplexName} placeholder="e.g. Complexe Montreal" />

           {/* --- THE ADDRESS PICKER --- */}
          <Text style={styles.label}>Search Address *</Text>
          <Text style={styles.label}>Search Address *</Text>

{/* FLOATING WRAPPER FOR DROPDOWN */}
<View style={{ zIndex: 2000, marginBottom: 10 }}> 
    <FreeAddressPicker 
        placeholder="Type address (e.g. 1250 Rene-Levesque, Montreal)" 
        initialValue={address}
        onAddressSelected={(data) => {
            setAddress(data.fullAddress);
            setPostalCode(data.postalCode);
        }} 
    />
</View>

          <Text style={styles.label}>Postal Code *</Text>
          <TextInput style={styles.input} value={postalCode} onChangeText={(t) => setPostalCode(t.toUpperCase())} maxLength={3} placeholder="H2X" />

          <Text style={styles.label}>Parking Instructions</Text>
          <TextInput style={[styles.input, {height: 60}]} multiline value={parkingInfo} onChangeText={setParkingInfo} />

          <Text style={styles.label}>General Info / Rules</Text>
          <TextInput style={[styles.input, {height: 60}]} multiline value={generalInfo} onChangeText={setGeneralInfo} />

          <TouchableOpacity style={styles.btn} onPress={handleSaveFacility}>
            <Text style={styles.btnText}>{isEditing ? 'Update Complex Info' : 'Save & Add Fields'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f2f5' },
  container: { flexGrow: 1, padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 10, elevation: 3 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, backgroundColor: '#f9f9f9' },
  btn: { backgroundColor: '#1A73E8', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
