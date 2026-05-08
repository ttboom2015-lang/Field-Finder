import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // In a real app, this connects to Supabase Auth.
    // For now, it logs us in and sends us to the Search page.
    router.push('/search');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>⚽ FieldFinder</Text>
      <Text style={styles.subtitle}>Manager Portal</Text>

      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.btnText}>Login</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} /><Text style={styles.or}>OR</Text><View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleBtn} onPress={handleLogin}>
          <Text style={styles.googleTxt}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', padding: 20 },
  logo: { fontSize: 36, fontWeight: 'bold', color: '#007bff' },
  subtitle: { fontSize: 18, color: '#555', marginBottom: 30 },
  card: { backgroundColor: '#fff', padding: 25, borderRadius: 10, width: '100%', maxWidth: 400, elevation: 3 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 15, backgroundColor: '#f9f9f9' },
  loginBtn: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#ccc' },
  or: { marginHorizontal: 10, color: '#888', fontWeight: 'bold' },
  googleBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, alignItems: 'center' },
  googleTxt: { color: '#333', fontWeight: 'bold', fontSize: 16 }
});