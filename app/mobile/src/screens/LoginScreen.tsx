import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Surface, Text, TextInput, Button, HelperText, Avatar, useTheme } from 'react-native-paper';
import { AuthApi } from '../api/auth';
import { spacing } from '../theme/theme';

export default function LoginScreen({ onLoginSuccess, onNavigateRegister }: {
  onLoginSuccess: () => void;
  onNavigateRegister: () => void;
}) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !password) {
      setFieldError('Email and password are required');
      return;
    }
    setFieldError(null);
    setLoading(true);
    try {
      await AuthApi.login(email, password);
      onLoginSuccess();
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
          <Avatar.Icon size={64} icon="message-text-outline" style={styles.logo} />
          <Text variant="headlineMedium" style={styles.title}>SmartSMS</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Welcome back — sign in to continue</Text>
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
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            left={<TextInput.Icon icon="lock-outline" />}
          />
          <HelperText type="error" visible={!!fieldError}>
            {fieldError}
          </HelperText>

          <Button mode="contained" onPress={handleLogin} loading={loading} disabled={loading} style={styles.button}>
            Login
          </Button>
          <Button mode="text" onPress={onNavigateRegister} style={styles.link}>
            Don't have an account? Register
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
