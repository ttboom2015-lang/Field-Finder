import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
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
  const [loading, setLoading] = useState(false);

  // -------------------------
  // LOGIN
  // -------------------------
  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter email and password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.replace('/search');
  };

  // -------------------------
  // REGISTER (USER ONLY)
  // -------------------------
  const handleRegister = async () => {
    if (!email || !password) {
      alert('Please fill in all fields.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert('Account created! Please complete your team profile.');
    router.replace('/create-team');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>⚽ FieldFinder</Text>
      <Text style={styles.subtitle}>Manager Portal</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'login' && styles.tabActive]}
          onPress={() => setTab('login')}
        >
          <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
            Sign In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'register' && styles.tabActive]}
          onPress={() => setTab('register')}
        >
          <Text
            style={[styles.tabText, tab === 'register' && styles.tabTextActive]}
          >
            Create Account
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password (min. 6 characters)"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={tab === 'login' ? handleLogin : handleRegister}
          >
            <Text style={styles.btnText}>
              {tab === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.note}>
        {tab === 'login'
          ? "Don't have an account? Tap 'Create Account' above."
          : 'You will complete your team profile after sign-up.'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    padding: 20,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007bff',
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    marginBottom: 24,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 20,
    padding: 3,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontWeight: 'bold',
    color: '#888',
  },
  tabTextActive: {
    color: '#007bff',
  },
  card: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 10,
    width: '100%',
    maxWidth: 400,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    fontSize: 15,
  },
  loginBtn: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  note: {
    marginTop: 20,
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 340,
  },
});