import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');

export default function AdminFields() {
  const router = useRouter();
  
  const [facility, setFacility] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [fieldName, setFieldName] = useState('');
  const [sport, setSport] = useState('Soccer');
  const [soccerFormat, setSoccerFormat] = useState('7v7');
  const [environment, setEnvironment] = useState('Outdoor');
  const [combinableNotes, setCombinableNotes] = useState('');
  const [externalIcalUrl, setExternalIcalUrl] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get the Facility First
      const { data: myFacility } = await supabase.from('facilities').select('*').eq('admin_id', user.id).maybeSingle();
      if (!myFacility) {
          router.replace('/admin-setup');
          return;
      }
      setFacility(myFacility);

      // 2. Get all fields belonging to this Facility
      const { data: myFields } = await supabase.from('fields').select('*').eq('facility_id', myFacility.id).order('created_at', { ascending: true });
      setFields(myFields || []);
      
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
      const targetFormat = getActualFormat();
      const fieldDataObj = {
        name: fieldName, sport, format: targetFormat, environment,
        is_combinable: combinableNotes.length > 0, combinable_notes: combinableNotes, external_ical_url: externalIcalUrl
      };

      if (editingFieldId) {
        await supabase.from('fields').update(fieldDataObj).eq('id', editingFieldId);
        alert("Field updated!");
      } else {
        await supabase.from('fields').insert([{ ...fieldDataObj, facility_id: facility.id }]);
        alert("Field added!");
      }
      resetForm(); loadData(); 
    } catch (err) { alert("Error saving field: " + err.message); }
  };

  const handleDeleteField = async (id) => {
    if (!window.confirm("Delete this field? All schedules will be lost.")) return;
    try {
      await supabase.from('field_availabilities').delete().eq('field_id', id);
      await supabase.from('fields').delete().eq('id', id);
      loadData();
    } catch (err) { alert("Error deleting field."); }
  };

  const resetForm = () => { setShowAddForm(false); setEditingFieldId(null); setFieldName(''); setCombinableNotes(''); setExternalIcalUrl(''); };

  if (loading || !facility) return <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 50}} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>{facility.name}</Text>
          <TouchableOpacity onPress={() => router.push('/admin-setup')}><Text style={{color: '#1A73E8', fontWeight: 'bold', marginTop: 5}}>⚙️ Edit Complex Info</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/')}><Text style={{color:'#fff', fontWeight: 'bold'}}>Logout</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {!showAddForm ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowAddForm(true); }}><Text style={styles.addBtnText}>+ Add a New Field / Court</Text></TouchableOpacity>
          ) : (
              <View style={styles.formContainer}>
                  <Text style={styles.formHeader}>{editingFieldId ? 'Edit Field' : 'Create New Field'}</Text>
                  
                  <Text style={styles.label}>Field Name</Text>
                  <TextInput style={styles.input} value={fieldName} onChangeText={setFieldName} placeholder="e.g. Field 1" />

                  <View style={{flexDirection: 'row', gap: 10}}>
                      <View style={{flex: 1}}><Text style={styles.label}>Sport</Text><View style={styles.pickerWrapper}><Picker selectedValue={sport} onValueChange={setSport}><Picker.Item label="Soccer" value="Soccer" /><Picker.Item label="Basketball" value="Basketball" /><Picker.Item label="Tennis" value="Tennis" /><Picker.Item label="Hockey" value="Hockey" /><Picker.Item label="Baseball" value="Baseball" /></Picker></View></View>
                      <View style={{flex: 1}}><Text style={styles.label}>Environment</Text><View style={styles.pickerWrapper}><Picker selectedValue={environment} onValueChange={setEnvironment}><Picker.Item label="Outdoor" value="Outdoor" /><Picker.Item label="Indoor" value="Indoor" /></Picker></View></View>
                  </View>

                  {sport === 'Soccer' ? (
                      <View><Text style={styles.label}>Format</Text><View style={styles.pickerWrapper}><Picker selectedValue={soccerFormat} onValueChange={setSoccerFormat}><Picker.Item label="5v5" value="5v5" /><Picker.Item label="7v7" value="7v7" /><Picker.Item label="9v9" value="9v9" /><Picker.Item label="11v11" value="11v11" /></Picker></View></View>
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
        {fields.length === 0 ? <Text style={{textAlign: 'center', color: '#666'}}>No fields added to this complex yet.</Text> : (
            fields.map((field) => (
                <View key={field.id} style={styles.fieldCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.fieldTitle}>{field.name}</Text>
                        <Text style={styles.fieldDetails}>{field.sport} | {field.environment} | {field.format}</Text>
                        <View style={{flexDirection: 'row', marginTop: 10, gap: 15}}>
                          <TouchableOpacity onPress={() => openEditForm(field)}><Text style={{color: '#1A73E8', fontWeight: 'bold'}}>✏️ Edit</Text></TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteField(field.id)}><Text style={{color: '#dc3545', fontWeight: 'bold'}}>🗑️ Delete</Text></TouchableOpacity>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => router.push(`/admin-dashboard?fieldId=${field.id}&fieldName=${field.name}`)}><Ionicons name="calendar" size={32} color="#1A73E8" /></TouchableOpacity>
                </View>
            ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#EEE' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  logoutBtn: { backgroundColor: '#dc3545', padding: 8, borderRadius: 5 },
  container: { padding: 15 },
  subHeader: { fontSize: 18, fontWeight: 'bold', color: '#555', marginBottom: 10 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 20, elevation: 2 },
  addBtn: { backgroundColor: '#1A73E8', padding: 15, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  formContainer: { padding: 10 },
  formHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 10, height: 45, justifyContent: 'center' },
  pickerWrapper: { backgroundColor: '#F1F3F4', borderRadius: 10, height: 45, justifyContent: 'center' },
  picker: { borderWidth: 0, backgroundColor: 'transparent' },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  fieldCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 10, elevation: 2, borderLeftWidth: 5, borderLeftColor: '#1A73E8' },
  fieldTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  fieldDetails: { fontSize: 14, color: '#666', marginTop: 5 }
});
