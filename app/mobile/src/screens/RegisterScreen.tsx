import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { AuthApi } from '../api/auth';

export default function RegisterScreen({ onRegisterSuccess, onNavigateLogin }: {
  onRegisterSuccess: () => void;
  onNavigateLogin: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
  if (!email || !password || !name) {
    Alert.alert('Error', 'Email and password and name are required');
    return;
  }
  if (password.length < 8) {
    Alert.alert('Error', 'Password must be at least 8 characters');
    return;
  }
  setLoading(true);
  try {
    const result = await AuthApi.register(email, password, name);
    console.log('Register result:', JSON.stringify(result));
    onRegisterSuccess();
    console.log('onRegisterSuccess called');
  } catch (e: any) {
    console.log('Register error:', e.message, e.response?.data);
    Alert.alert('Registration failed', e.response?.data?.error || 'Something went wrong');
  } finally {
    setLoading(false);
  }
}
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="name"
        value={name}
        onChangeText={setName}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 8 chars)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry

      />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Register'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onNavigateLogin}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title:     { fontSize: 28, fontWeight: '600', marginBottom: 32, textAlign: 'center' },
  input:     { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 15 },
  button:    { backgroundColor: '#1D9E75', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText:{ color: '#fff', fontWeight: '600', fontSize: 15 },
  link:      { textAlign: 'center', marginTop: 16, color: '#1D9E75' },
});