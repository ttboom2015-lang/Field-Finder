import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lsquxrvufehselooyenj.supabase.co',
  'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'
);

export default function Login() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('team_manager');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter email and password.');
      return;
    }
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      if (authData.user) {
        const { data: profileData } = await supabase.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
        const userRole = profileData?.role || 'team_manager';

        if (userRole === 'club_admin') {
          router.replace('/admin-fields');
        } 
        else if (userRole === 'parent_player') {
          router.replace('/parent-dashboard'); 
        } 
        else {
          const { data: teamData } = await supabase.from('teams').select('id').eq('manager_id', authData.user.id).maybeSingle();
          if (teamData) router.replace('/search'); 
          else router.replace('/create-team'); 
        }
      }
    } catch (error) {
      alert("Login Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      alert('Please fill in all fields.');
      return;
    }
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authData.user.id, full_name: fullName, email: email, role: role
        }]);
        if (profileError) throw profileError;

        alert('Account created successfully!');
        if (role === 'club_admin') router.replace('/admin-setup'); 
        else if (role === 'parent_player') router.replace('/join-team'); 
        else router.replace('/create-team');
      }
    } catch (error) {
      alert("Registration Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to handle the "Enter" key press
  const handleSubmit = () => {
    if (tab === 'login') handleLogin();
    else handleRegister();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>⚽ FieldFinder</Text>
      <Text style={styles.subtitle}>Sports Management Platform</Text>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'login' && styles.tabActive]} onPress={() => setTab('login')}>
          <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'register' && styles.tabActive]} onPress={() => setTab('register')}>
          <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>Create Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {tab === 'register' && (
          <>
            <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
            <Text style={styles.label}>I am a:</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={role} onValueChange={setRole}>
                <Picker.Item label="Team Manager / Coach" value="team_manager" />
                <Picker.Item label="Club / Facility Administrator" value="club_admin" />
                <Picker.Item label="Parent / Player" value="parent_player" />
              </Picker>
            </View>
          </>
        )}

        <TextInput style={styles.input} placeholder="Email" value={email} autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} />
        
        {/* ADDED: returnKeyType and onSubmitEditing to capture the Enter Key */}
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          value={password} 
          secureTextEntry 
          onChangeText={setPassword} 
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          blurOnSubmit={false}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity style={styles.loginBtn} onPress={handleSubmit}>
            <Text style={styles.btnText}>{tab === 'login' ? 'Sign In' : 'Create Account'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', padding: 20 },
  logo: { fontSize: 36, fontWeight: 'bold', color: '#007bff' },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 24 },
  tabRow: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 8, marginBottom: 20, padding: 3 },
  tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 6 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontWeight: 'bold', color: '#888' },
  tabTextActive: { color: '#007bff' },
  card: { backgroundColor: '#fff', padding: 25, borderRadius: 10, width: '100%', maxWidth: 400, elevation: 3 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 15, backgroundColor: '#f9f9f9', fontSize: 15 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#f9f9f9', marginBottom: 15 },
  loginBtn: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
