import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');
const GOOGLE_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

export default function AdminFields() {
  const router = useRouter();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [fieldName, setFieldName] = useState('');
  const [sport, setSport] = useState('Soccer');
  const [soccerFormat, setSoccerFormat] = useState('7v7');
  const [environment, setEnvironment] = useState('Outdoor');
  const [combinableNotes, setCombinableNotes] = useState('');
  const [externalIcalUrl, setExternalIcalUrl] = useState('');
  
  const [facilityData, setFacilityData] = useState(null);

  useEffect(() => { loadMyFields(); }, []);

  const loadMyFields = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: myFields, error } = await supabase.from('fields').select('*').eq('admin_id', user.id).order('created_at', { ascending: true });
      if (error) throw error;
      setFields(myFields || []);
      if (myFields && myFields.length > 0) {
        setFacilityData({ address: myFields[0].address, postal_code: myFields[0].postal_code, club_email: myFields[0].club_email });
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const getActualFormat = () => {
      if (sport === 'Basketball') return '5v5';
      if (['Tennis', 'Hockey', 'Baseball'].includes(sport)) return 'Other';
      return soccerFormat;
  };

  const openEditForm = (field) => {
    setEditingFieldId(field.id); setFieldName(field.name); setSport(field.sport || 'Soccer');
    if (field.sport === 'Soccer') setSoccerFormat(field.format || '7v7');
    setEnvironment(field.environment || 'Outdoor'); setCombinableNotes(field.combinable_notes || ''); setExternalIcalUrl(field.external_ical_url || '');
    setShowAddForm(true);
  };

  const handleSaveField = async () => {
    if (!fieldName) { alert("Please enter a field name."); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetFormat = getActualFormat();
      
      const fieldDataObj = {
        name: fieldName, sport: sport, format: targetFormat, environment: environment,
        is_combinable: combinableNotes.length > 0, combinable_notes: combinableNotes, external_ical_url: externalIcalUrl
      };

      if (editingFieldId) {
        await supabase.from('fields').update(fieldDataObj).eq('id', editingFieldId);
        alert("Field updated successfully!");
      } else {
        if (!facilityData) { alert("Please setup your facility address first!"); router.replace('/admin-setup'); return; }
        await supabase.from('fields').insert([{ ...fieldDataObj, admin_id: user.id, address: facilityData.address, postal_code: facilityData.postal_code, club_email: facilityData.club_email }]);
        alert("Field added successfully!");
      }
      resetForm(); loadMyFields(); 
    } catch (err) { alert("Error saving field: " + err.message); }
  };

  const handleDeleteField = async (id) => {
    if (!window.confirm("Delete this field? All schedules will be lost.")) return;
    try {
      await supabase.from('field_availabilities').delete().eq('field_id', id);
      await supabase.from('fields').delete().eq('id', id);
      loadMyFields();
    } catch (err) { alert("Error deleting field."); }
  };

  const resetForm = () => { setShowAddForm(false); setEditingFieldId(null); setFieldName(''); setCombinableNotes(''); setExternalIcalUrl(''); };

  if (loading) return <ActivityIndicator size="large" color="#007bff" style={{marginTop: 50}} />;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>My Facility Fields</Text>
          <TouchableOpacity onPress={() => router.push('/admin-setup')}><Text style={{color: '#007bff', fontWeight: 'bold', marginTop: 5}}>⚙️ Edit Club Info</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/')}><Text style={{color:'#fff', fontWeight: 'bold'}}>Logout</Text></TouchableOpacity>
      </View>

      <View style={styles.card}>
        {!showAddForm ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowAddForm(true); }}><Text style={styles.addBtnText}>+ Add a New Field / Court</Text></TouchableOpacity>
        ) : (
            <View style={styles.formContainer}>
                <Text style={styles.formHeader}>{editingFieldId ? 'Edit Field' : 'Create New Field'}</Text>
                
                <Text style={styles.label}>Field Name</Text>
                <TextInput style={styles.input} value={fieldName} onChangeText={setFieldName} />

                <View style={{flexDirection: 'row', gap: 10}}>
                    <View style={{flex: 1}}><Text style={styles.label}>Sport</Text><Picker style={styles.picker} selectedValue={sport} onValueChange={setSport}><Picker.Item label="Soccer" value="Soccer" /><Picker.Item label="Basketball" value="Basketball" /><Picker.Item label="Tennis" value="Tennis" /><Picker.Item label="Hockey" value="Hockey" /><Picker.Item label="Baseball" value="Baseball" /></Picker></View>
                    <View style={{flex: 1}}><Text style={styles.label}>Environment</Text><Picker style={styles.picker} selectedValue={environment} onValueChange={setEnvironment}><Picker.Item label="Outdoor" value="Outdoor" /><Picker.Item label="Indoor" value="Indoor" /></Picker></View>
                </View>

                {sport === 'Soccer' ? (
                    <View><Text style={styles.label}>Format</Text><Picker style={styles.picker} selectedValue={soccerFormat} onValueChange={setSoccerFormat}><Picker.Item label="5v5" value="5v5" /><Picker.Item label="7v7" value="7v7" /><Picker.Item label="9v9" value="9v9" /><Picker.Item label="11v11" value="11v11" /></Picker></View>
                ) : (
                    <View><Text style={styles.label}>Format</Text><View style={styles.input}><Text style={{color: '#666', fontWeight: 'bold'}}>{getActualFormat()}</Text></View></View>
                )}

                <Text style={styles.label}>Combinable Notes</Text>
                <TextInput style={styles.input} value={combinableNotes} onChangeText={setCombinableNotes} />

                <Text style={styles.label}>iCal URL</Text>
                <TextInput style={styles.input} value={externalIcalUrl} onChangeText={setExternalIcalUrl} autoCapitalize="none" />

                <View style={{flexDirection: 'row', gap: 10, marginTop: 15}}>
                    <TouchableOpacity style={[styles.btn, {backgroundColor: '#28a745', flex: 1}]} onPress={handleSaveField}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, {backgroundColor: '#6c757d', flex: 1}]} onPress={resetForm}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
                </View>
            </View>
        )}
      </View>

      <Text style={styles.subHeader}>Select a field to manage schedule:</Text>
      {fields.map((field) => (
          <View key={field.id} style={styles.fieldCard}>
              <View style={{ flex: 1 }}>
                  <Text style={styles.fieldTitle}>{field.name}</Text>
                  <Text style={styles.fieldDetails}>{field.sport} | {field.environment} | {field.format}</Text>
                  <View style={{flexDirection: 'row', marginTop: 10, gap: 15}}>
                    <TouchableOpacity onPress={() => openEditForm(field)}><Text style={{color: '#007bff', fontWeight: 'bold'}}>✏️ Edit</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteField(field.id)}><Text style={{color: '#dc3545', fontWeight: 'bold'}}>🗑️ Delete</Text></TouchableOpacity>
                  </View>
              </View>
              <TouchableOpacity onPress={() => router.push(`/admin-dashboard?fieldId=${field.id}&fieldName=${field.name}`)}><Text style={styles.arrow}>📅 Calendar →</Text></TouchableOpacity>
          </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f4f6f9' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#343a40' },
  logoutBtn: { backgroundColor: '#dc3545', padding: 8, borderRadius: 5 },
  subHeader: { fontSize: 18, fontWeight: 'bold', color: '#555', marginBottom: 10 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 20, elevation: 2 },
  addBtn: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  formContainer: { padding: 10 },
  formHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, backgroundColor: '#f9f9f9', justifyContent: 'center', height: 45 },
  picker: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#f9f9f9', height: 45 },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  fieldCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 8, marginBottom: 10, elevation: 2, borderLeftWidth: 5, borderLeftColor: '#007bff' },
  fieldTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  fieldDetails: { fontSize: 14, color: '#666', marginTop: 5 },
  arrow: { color: '#007bff', fontWeight: 'bold', padding: 10, fontSize: 16 }
});
