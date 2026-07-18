# Challenges

## Dark mode background/text contrast bug (2026-07-18)

**Symptom:** After toggling Dark mode in Settings, the Dashboard screen showed
themed (dark) Appbar/cards but a large light-gray/white area below the
breakdown card, with "By category" and the cache-status text barely visible
(near-invisible light-on-light text).

**Root cause:** Every screen's root container hardcoded
`backgroundColor: '#F4F7F5'` in its `StyleSheet`, instead of reading from the
active Paper theme (`theme1` / `theme2` in `src/theme/theme.ts`, switched via
`setTheme` in `App.tsx`). Paper components (`Appbar`, `Card`, `Text`) render
correctly themed, but the screen background stayed fixed to the light color,
so in dark mode the theme's light-colored default text (`onSurface`) became
nearly invisible against the leftover hardcoded light background.

**Fix:** In each screen, pulled `useTheme()` from `react-native-paper` and set
the root container's background to `theme.colors.background` instead of the
hardcoded hex, so the background now follows whichever theme is active.

### Files changed

- `src/screens/DashboardScreen.tsx`
  - Imported `useTheme` from `react-native-paper`.
  - Added `const theme = useTheme();`.
  - Root `<View>` style: `[styles.container, { backgroundColor: theme.colors.background }]`.
  - Removed `backgroundColor: '#F4F7F5'` from `styles.container`.

- `src/screens/HomeScreen.tsx`
  - Imported `useTheme` from `react-native-paper`.
  - Added `const theme = useTheme();`.
  - Root `<View>` style: `[styles.container, { backgroundColor: theme.colors.background }]`.
  - Removed `backgroundColor: '#F4F7F5'` from `styles.container`.

- `src/screens/SettingsScreen.tsx`
  - Imported `useTheme` from `react-native-paper`.
  - Added `const theme = useTheme();`.
  - Root `<View>` style: `[styles.container, { backgroundColor: theme.colors.background }]`.
  - Removed `backgroundColor: '#F4F7F5'` from `styles.container`.

- `src/screens/LoginScreen.tsx`
  - Imported `useTheme` from `react-native-paper`.
  - Added `const theme = useTheme();`.
  - `<KeyboardAvoidingView>` style: `[styles.flex, { backgroundColor: theme.colors.background }]`.
  - Removed `backgroundColor: '#F4F7F5'` from `styles.flex`.

- `src/screens/RegisterScreen.tsx`
  - Imported `useTheme` from `react-native-paper`.
  - Added `const theme = useTheme();`.
  - `<KeyboardAvoidingView>` style: `[styles.flex, { backgroundColor: theme.colors.background }]`.
  - Removed `backgroundColor: '#F4F7F5'` from `styles.flex`.

**Verification:** `npx tsc --noEmit` ran clean after the changes. Not yet
verified visually in the running app — reload and toggle Dark mode in
Settings to confirm the Dashboard renders correctly in both themes.

## Dashboard stats not updating after deleting a message (2026-07-18)

**Symptom:** Deleting a message from the Home list did not update the
Dashboard's stats (Cleaned count, category breakdown). Pulling to refresh on
the Dashboard showed the correct, up-to-date numbers. Running "Run clean"
(the broom action on Home), however, did make the Dashboard reflect the
change without a manual refresh.

**Root cause:** `DashboardScreen` only fetched analytics once, in a mount-only
effect (`useEffect(() => { load(); }, [load])`). `TabsShell` in `App.tsx`
renders all three tabs through `react-native-paper`'s `BottomNavigation`,
which keeps previously-visited scenes mounted when switching tabs instead of
remounting them — so once you'd visited the Dashboard tab once, its
`useEffect` never ran again, and switching back to it after a delete just
showed the same stale `summary` state. `Run clean` appeared to "work" only
because that was typically the first time Dashboard got mounted after the
action, not because it pushed any update to it.

Deleting a message does correctly call `logClean(..., 'delete')` in
`HomeScreen.handleDelete`, so the backend analytics were always accurate —
the bug was purely the Dashboard screen not refetching on tab focus.

**Fix:** Made the Dashboard refetch analytics every time its tab becomes
focused, instead of only on first mount.

### Files changed

- `src/screens/DashboardScreen.tsx`
  - Component now accepts an optional `focused?: boolean` prop (default
    `true`, so nothing that renders it without the prop breaks).
  - Replaced `useEffect(() => { load(); }, [load]);` with
    `useEffect(() => { if (focused) load(); }, [focused, load]);` so data is
    refetched whenever the screen transitions to focused, not just once.

- `App.tsx`
  - `TabsShell.renderScene`'s `'dashboard'` case now passes
    `focused={index === 1}` to `DashboardScreen`, wiring the current tab
    index through so the screen knows when it has gained focus.

**Verification:** `npx tsc --noEmit` ran clean after the changes. Not yet
verified visually in the running app — delete a message from Home, switch to
Dashboard, and confirm the stats update without needing to pull-to-refresh.
