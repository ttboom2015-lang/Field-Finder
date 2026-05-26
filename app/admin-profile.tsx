import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');

export default function AdminProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email);

      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (data) setFullName(data.full_name || '');
      
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleUpdate = async () => {
      if (!fullName) { alert("Name cannot be empty"); return; }
      setSaving(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
          alert("Profile updated successfully!");
          router.replace('/admin-fields');
      } catch (err) { alert("Error saving profile"); } finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 50}}/>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
        <View style={{width: 40}} /> 
      </View>

      <View style={{padding: 20}}>
          <View style={styles.card}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />
              
              <Text style={styles.label}>Email Address (Read-only)</Text>
              <TextInput style={[styles.input, {backgroundColor: '#E8E8E8', color: '#666'}]} value={email} editable={false} />

              <TouchableOpacity style={styles.btn} onPress={handleUpdate} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Profile</Text>}
              </TouchableOpacity>
          </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#F1F3F4', padding: 15, borderRadius: 10, fontSize: 16 },
  btn: { backgroundColor: '#1A73E8', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 25 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
