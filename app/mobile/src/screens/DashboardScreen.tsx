import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Appbar, Card, Text, ActivityIndicator, ProgressBar, Divider, Icon, useTheme } from 'react-native-paper';
import { getAnalytics, AnalyticsSummary } from '../api/analytics';
import { CATEGORY_COLORS, CATEGORY_ICONS, spacing } from '../theme/theme';

export default function DashboardScreen({ focused = true }: { focused?: boolean } = {}) {
  const theme = useTheme();
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

  // BottomNavigation keeps this screen mounted across tab switches, so a plain
  // mount-only effect would only ever fetch once. Refetch every time the tab
  // becomes focused so stats (e.g. after deleting a message) don't go stale.
  useEffect(() => { if (focused) load(); }, [focused, load]);

  const maxCount = summary ? Math.max(1, ...Object.values(summary.byCategory)) : 1;
  const categories = Object.entries(summary?.byCategory ?? {});

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Dashboard" />
      </Appbar.Header>

      {loading && !summary ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        >
          <View style={styles.statsRow}>
            <Card style={styles.statCard} mode="elevated">
              <Card.Content style={styles.statContent}>
                <Icon source="check-decagram-outline" size={22} color="#1D9E75" />
                <Text variant="headlineSmall" style={styles.statValue}>{summary?.totalCleaned ?? 0}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Cleaned</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard} mode="elevated">
              <Card.Content style={styles.statContent}>
                <Icon source="clock-outline" size={22} color="#185FA5" />
                <Text variant="headlineSmall" style={styles.statValue}>{summary?.timeSavedMinutes ?? 0}m</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Time saved</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard} mode="elevated">
              <Card.Content style={styles.statContent}>
                <Icon source="shape-outline" size={22} color="#7F77DD" />
                <Text variant="headlineSmall" style={styles.statValue}>{categories.length}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Categories</Text>
              </Card.Content>
            </Card>
          </View>

          <Text variant="labelSmall" style={styles.cacheNote}>
            {summary?.cached ? 'Served from cache' : 'Freshly computed'}
          </Text>

          <Divider style={styles.divider} />
          <Text variant="titleMedium" style={styles.sectionTitle}>By category</Text>

          <Card mode="elevated" style={styles.breakdownCard}>
            <Card.Content>
              {categories.map(([category, count]) => {
                const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.unknown;
                return (
                  <View key={category} style={styles.barRow}>
                    <View style={styles.barLabelRow}>
                      <Icon source={CATEGORY_ICONS[category] || CATEGORY_ICONS.unknown} size={16} color={color} />
                      <Text variant="bodyMedium" style={styles.barLabel}>{category}</Text>
                      <Text variant="bodyMedium" style={styles.barCount}>{count}</Text>
                    </View>
                    <ProgressBar
                      progress={count / maxCount}
                      color={color}
                      style={styles.progressBar}
                    />
                  </View>
                );
              })}
              {categories.length === 0 && (
                <Text style={styles.empty}>No cleanup activity yet</Text>
              )}
            </Card.Content>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent:  { padding: spacing.md, paddingBottom: spacing.xxl },
  statsRow:       { flexDirection: 'row', gap: spacing.sm },
  statCard:       { flex: 1 },
  statContent:    { alignItems: 'center', paddingVertical: spacing.sm },
  statValue:      { fontWeight: '700', marginTop: spacing.xs },
  statLabel:      { opacity: 0.6, marginTop: 2 },
  cacheNote:      { textAlign: 'center', opacity: 0.5, marginTop: spacing.sm },
  divider:        { marginTop: spacing.lg, marginBottom: spacing.md },
  sectionTitle:   { fontWeight: '600', marginBottom: spacing.sm },
  breakdownCard:  { marginBottom: spacing.md },
  barRow:         { marginBottom: spacing.md },
  barLabelRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: spacing.xs },
  barLabel:       { flex: 1 },
  barCount:       { opacity: 0.6 },
  progressBar:    { height: 8, borderRadius: 4 },
  empty:          { textAlign: 'center', opacity: 0.5, marginTop: spacing.md },
});
