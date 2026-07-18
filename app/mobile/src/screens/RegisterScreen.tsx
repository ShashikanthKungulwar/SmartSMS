import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Surface, Text, TextInput, Button, HelperText, Avatar, useTheme } from 'react-native-paper';
import { AuthApi } from '../api/auth';
import { spacing } from '../theme/theme';

export default function RegisterScreen({ onRegisterSuccess, onNavigateLogin }: {
  onRegisterSuccess: () => void;
  onNavigateLogin: () => void;
}) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleRegister() {
    if (!email || !password || !name) {
      setFieldError('Email, name and password are all required');
      return;
    }
    if (password.length < 8) {
      setFieldError('Password must be at least 8 characters');
      return;
    }
    setFieldError(null);
    setLoading(true);
    try {
      await AuthApi.register(email, password, name);
      onRegisterSuccess();
    } catch (e: any) {
      setFieldError(e.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <Avatar.Icon size={64} icon="account-plus-outline" style={styles.logo} />
          <Text variant="headlineMedium" style={styles.title}>Create account</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Join SmartSMS to get started</Text>
        </View>

        <Surface style={styles.surface} elevation={2}>
          <TextInput
            mode="outlined"
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            left={<TextInput.Icon icon="email-outline" />}
          />
          <TextInput
            mode="outlined"
            label="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            style={styles.input}
            left={<TextInput.Icon icon="account-outline" />}
          />
          <TextInput
            mode="outlined"
            label="Password (min 8 chars)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            left={<TextInput.Icon icon="lock-outline" />}
          />
          <HelperText type="error" visible={!!fieldError}>
            {fieldError}
          </HelperText>

          <Button mode="contained" onPress={handleRegister} loading={loading} disabled={loading} style={styles.button}>
            Register
          </Button>
          <Button mode="text" onPress={onNavigateLogin} style={styles.link}>
            Already have an account? Login
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:     { flex: 1 },
  scroll:   { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logo:     { backgroundColor: '#1D9E75', marginBottom: spacing.md },
  title:    { fontWeight: '700' },
  subtitle: { opacity: 0.6, marginTop: spacing.xs },
  surface:  { borderRadius: 16, padding: spacing.xl },
  input:    { marginBottom: spacing.sm },
  button:   { marginTop: spacing.sm, borderRadius: 8 },
  link:     { marginTop: spacing.xs },
});
