import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Appbar, Searchbar, Card, Text, Chip, IconButton, Menu, Divider,
  ActivityIndicator, ProgressBar, Icon, useTheme,
} from 'react-native-paper';
import { Sms, submitFeedback } from '../native/SmsNative';
import { logClean } from '../api/analytics';
import { CATEGORY_COLORS, CATEGORY_ICONS, spacing } from '../theme/theme';

const LABELS = ['OTP', 'Bank', 'Promo', 'Delivery', 'Spam', 'Personal'];

function formatTimestamp(dateStr: string): string {
  const ms = Number(dateStr);
  if (!ms) return '';
  const date = new Date(ms);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function SmsCard({ item, menuOpen, onOpenMenu, onCloseMenu, onDelete }: {
  item: Sms;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onDelete: () => void;
}) {
  const label = item.predictedLabel;
  const color = CATEGORY_COLORS[label || 'unknown'] || CATEGORY_COLORS.unknown;
  const icon = CATEGORY_ICONS[label || 'unknown'] || CATEGORY_ICONS.unknown;

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleSmall" style={styles.sender} numberOfLines={1}>
            {item.address}
          </Text>
          <Text variant="bodySmall" style={styles.timestamp}>
            {formatTimestamp(item.date)}
          </Text>
        </View>

        <Text variant="bodyMedium" style={styles.body} numberOfLines={2} ellipsizeMode="tail">
          {item.body}
        </Text>

        <View style={styles.cardFooter}>
          {label ? (
            <Chip
              compact
              icon={() => <Icon source={icon} color={color} size={16} />}
              selectedColor={color}
              style={[styles.chip, { backgroundColor: color + '22' }]}
              textStyle={styles.chipText}
            >
              {label}
            </Chip>
          ) : (
            <ActivityIndicator size="small" style={styles.chipLoading} />
          )}

          <Menu
            visible={menuOpen}
            onDismiss={onCloseMenu}
            anchor={<IconButton icon="dots-vertical" size={20} onPress={onOpenMenu} />}
          >
            <Menu.Item
              leadingIcon="delete-outline"
              title="Delete"
              onPress={() => {
                onCloseMenu();
                onDelete();
              }}
            />
            <Divider />
            <Menu.Item title="Correct label" disabled />
            {LABELS.map(l => (
              <Menu.Item
                key={l}
                title={l}
                leadingIcon={label === l ? 'check' : undefined}
                onPress={() => {
                  onCloseMenu();
                  submitFeedback(item.body, label || 'unknown', l);
                }}
              />
            ))}
          </Menu>
        </View>
      </Card.Content>
    </Card>
  );
}

export default function HomeScreen({
  smsList, loading, error, deleteSms, search, onOpenDashboard, onLogout, onRunClean,
}: {
  smsList: Sms[];
  loading: boolean;
  error: string | null;
  deleteSms: (id: string) => Promise<void>;
  search: (query: string) => void;
  onOpenDashboard: () => void;
  onLogout: () => void;
  onRunClean: () => void;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [topMenuVisible, setTopMenuVisible] = useState(false);

  function handleSearch(text: string) {
    setQuery(text);
    search(text);
  }

  async function handleDelete(item: Sms) {
    await deleteSms(item.id);
    logClean(item.predictedLabel || 'unknown', 'delete').catch(() => {});
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="SmartSMS" />
        <Appbar.Action icon="broom" onPress={onRunClean} accessibilityLabel="Run clean now" />
        <Menu
          visible={topMenuVisible}
          onDismiss={() => setTopMenuVisible(false)}
          anchor={<Appbar.Action icon="dots-vertical" onPress={() => setTopMenuVisible(true)} />}
        >
          <Menu.Item
            leadingIcon="view-dashboard-outline"
            title="Dashboard"
            onPress={() => {
              setTopMenuVisible(false);
              onOpenDashboard();
            }}
          />
          <Divider />
          <Menu.Item
            leadingIcon="logout"
            title="Logout"
            onPress={() => {
              setTopMenuVisible(false);
              onLogout();
            }}
          />
        </Menu>
      </Appbar.Header>

      {loading && smsList.length > 0 && <ProgressBar indeterminate style={styles.refreshBar} />}

      <Searchbar
        placeholder="Search messages..."
        value={query}
        onChangeText={handleSearch}
        style={styles.searchbar}
      />

      {error && (
        <Text variant="bodySmall" style={styles.error}>{error}</Text>
      )}

      {loading && smsList.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : smsList.length === 0 ? (
        <View style={styles.centered}>
          <IconButton icon="email-off-outline" size={48} disabled style={styles.emptyIcon} />
          <Text variant="titleMedium" style={styles.emptyTitle}>No messages</Text>
          <Text variant="bodyMedium" style={styles.emptySubtitle}>
            Nothing to show here yet — new messages will appear automatically.
          </Text>
        </View>
      ) : (
        <FlatList
          data={smsList}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <SmsCard
              item={item}
              menuOpen={menuFor === item.id}
              onOpenMenu={() => setMenuFor(item.id)}
              onCloseMenu={() => setMenuFor(null)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  refreshBar:   { height: 2 },
  searchbar:    { margin: spacing.md, elevation: 1 },
  listContent:  { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  card:         { marginBottom: spacing.sm },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sender:       { fontWeight: '700', flexShrink: 1, marginRight: spacing.sm },
  timestamp:    { opacity: 0.5 },
  body:         { marginTop: spacing.xs, opacity: 0.85 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  chip:         { height: 32 },
  chipText:     { fontSize: 12, fontWeight: '600' },
  chipLoading:  { marginLeft: spacing.xs },
  error:        { color: '#B33131', marginHorizontal: spacing.md, marginBottom: spacing.xs },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon:    { opacity: 0.4 },
  emptyTitle:   { marginTop: spacing.sm, fontWeight: '600' },
  emptySubtitle:{ opacity: 0.6, textAlign: 'center', marginTop: spacing.xs },
});
