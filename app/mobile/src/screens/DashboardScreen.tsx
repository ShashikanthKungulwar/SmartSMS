import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { getAnalytics, AnalyticsSummary } from '../api/analytics';

const BAR_COLOR = '#1D9E75';

export default function DashboardScreen({ onBack }: { onBack: () => void }) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAnalytics();
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const maxCount = summary ? Math.max(1, ...Object.values(summary.byCategory)) : 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={{ backgroundColor: "red", padding: 10 }} onPress={() => { console.log('Back pressed');   onBack(); }}><Text style={styles.back}>{'< Back'}</Text></TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading && !summary ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary?.totalCleaned ?? 0}</Text>
              <Text style={styles.statLabel}>Messages cleaned</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary?.timeSavedMinutes ?? 0}m</Text>
              <Text style={styles.statLabel}>Time saved</Text>
            </View>
          </View>
          <Text style={styles.cacheNote}>
            {summary?.cached ? 'served from cache' : 'freshly computed'}
          </Text>

          <Text style={styles.sectionTitle}>By category</Text>
          {Object.entries(summary?.byCategory ?? {}).map(([category, count]) => (
            <View key={category} style={styles.barRow}>
              <Text style={styles.barLabel}>{category}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(count / maxCount) * 100}%` }]} />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          ))}
          {summary && Object.keys(summary.byCategory).length === 0 && (
            <Text style={styles.empty}>No cleanup activity yet</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, padding: 16, backgroundColor: '#fff' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  back:         { color: '#1D9E75', fontSize: 14 },
  title:        { fontSize: 18, fontWeight: '600' },
  statsRow:     { flexDirection: 'row', gap: 12, marginBottom: 8 },
  statCard:     { flex: 1, backgroundColor: '#f4f4f4', borderRadius: 8, padding: 16, alignItems: 'center' },
  statValue:    { fontSize: 24, fontWeight: '700', color: '#1D9E75' },
  statLabel:    { fontSize: 12, color: '#666', marginTop: 4 },
  cacheNote:    { fontSize: 11, color: '#999', textAlign: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  barRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel:     { width: 70, fontSize: 12, color: '#333' },
  barTrack:     { flex: 1, height: 12, backgroundColor: '#eee', borderRadius: 6, overflow: 'hidden', marginHorizontal: 8 },
  barFill:      { height: '100%', backgroundColor: BAR_COLOR, borderRadius: 6 },
  barCount:     { width: 28, fontSize: 12, textAlign: 'right', color: '#333' },
  empty:        { textAlign: 'center', color: '#999', marginTop: 20 },
});
