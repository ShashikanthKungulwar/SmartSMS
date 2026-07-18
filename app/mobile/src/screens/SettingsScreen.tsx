import React, { useState } from 'react';
import { View, StyleSheet, Appearance, ScrollView } from 'react-native';
import { Appbar, List, Divider, Switch, useTheme } from 'react-native-paper';
import { classifySms } from '../native/SmsNative';
import pkg from '../../package.json';
import { theme1, theme2 } from '../theme/theme';

export default function SettingsScreen({ onLogout, setTheme }: { onLogout: () => void; setTheme: (theme: any) => void }) {
  const theme = useTheme();
  const [darkMode, setDarkMode] = useState(Appearance.getColorScheme() === 'dark');
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<string | null>(null);

  function toggleDarkMode(value: boolean) {
    setDarkMode(value);
    console.log(Appearance.getColorScheme());
    Appearance.setColorScheme(value ? 'dark' : 'light');
    value ? setTheme(theme2) : setTheme(theme1);
    console.log(Appearance.getColorScheme());
  }

  async function runBenchmark() {
    setBenchmarking(true);
    setBenchmarkResult(null);
    try {
      const samples = [
        'Your OTP is 4521. Valid for 10 minutes.',
        'Rs.5000 debited from A/c XX1234. Bal: Rs.20000',
        'MEGA SALE! 50% off at Amazon today',
      ];
      await classifySms(samples[0]);
      const times: number[] = [];
      for (let i = 0; i < 20; i++) {
        for (const s of samples) {
          const r = await classifySms(s);
          times.push(r.latencyMs);
        }
      }
      times.sort((a, b) => a - b);
      const p50 = times[Math.floor(times.length * 0.5)];
      const p95 = times[Math.floor(times.length * 0.95)];
      setBenchmarkResult(`p50: ${p50}ms, p95: ${p95}ms`);
    } finally {
      setBenchmarking(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView>
        <List.Section>
          <List.Item
            title="Logout"
            left={props => <List.Icon {...props} icon="logout" />}
            onPress={onLogout}
          />
          <Divider />
          <List.Item
            title="Dark mode"
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => <Switch value={darkMode} onValueChange={toggleDarkMode} />}
          />
        </List.Section>

        <List.Section title="Debug">
          <List.Item
            title="Benchmark model"
            description={benchmarking ? 'Running…' : benchmarkResult ?? 'On-device inference latency'}
            left={props => <List.Icon {...props} icon="speedometer" />}
            onPress={runBenchmark}
            disabled={benchmarking}
          />
        </List.Section>

        <List.Section title="About">
          <List.Item
            title="SmartSMS"
            description={`Version ${pkg.version}`}
            left={props => <List.Icon {...props} icon="information-outline" />}
          />
        </List.Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
