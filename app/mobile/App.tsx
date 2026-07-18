import React, { useEffect, useState } from 'react';
import { View, InteractionManager, ActivityIndicator } from 'react-native';
import { PaperProvider, BottomNavigation } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { AuthApi } from './src/api/auth';
import { triggerCleanNow, onSmsReceived } from './src/native/SmsNative';
import { logClean } from './src/api/analytics';
import { requestSmsPermissions } from './src/permissions/SmsPermission';
import { useSms } from './src/hooks/useSms';
// import { theme1,theme2 } from './src/theme/theme';
import { theme1,theme2} from './src/theme/theme';

type AuthScreen = 'login' | 'register';

function TabsShell({ onLogout,setTheme }: { onLogout: () => void; setTheme: (theme: any) => void }) {
  const { smsList, loading, error, load, deleteSms, search } = useSms();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'home', title: 'Home', focusedIcon: 'message-text', unfocusedIcon: 'message-text-outline' },
    { key: 'dashboard', title: 'Dashboard', focusedIcon: 'view-dashboard', unfocusedIcon: 'view-dashboard-outline' },
    { key: 'settings', title: 'Settings', focusedIcon: 'cog', unfocusedIcon: 'cog-outline' },
  ]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      const granted = await requestSmsPermissions();
      if (granted) load();
    });
    return () => task.cancel();
  }, [load]);

  useEffect(() => {
    const unsubscribe = onSmsReceived(() => {
      load();
    });
    return unsubscribe;
  }, [load]);

  async function handleRunClean() {
    await triggerCleanNow();
    // SmsCleanWorker only targets OTP-pattern messages (see cleanOtpSms)
    logClean('OTP', 'auto-clean').catch(() => {});
    setTimeout(() => load(), 2000);
  }

  const renderScene = ({ route }: { route: { key: string } }) => {
    switch (route.key) {
      case 'home':
        return (
          <HomeScreen
            smsList={smsList}
            loading={loading}
            error={error}
            deleteSms={deleteSms}
            search={search}
            onOpenDashboard={() => setIndex(1)}
            onLogout={onLogout}
            onRunClean={handleRunClean}
          />
        );
      case 'dashboard':
        return <DashboardScreen focused={index === 1} />;
      case 'settings':
        return <SettingsScreen onLogout={onLogout} setTheme={setTheme} />;
      default:
        return null;
    }
  };

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
    />
  );
}

export default function App() {
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [theme, setTheme] = useState(theme1);

  useEffect(() => {
    AuthApi.isLoggedIn().then(loggedIn => {
      setAuthed(loggedIn);
      setChecking(false);
    });
  }, []);

  async function handleLogout() {
    await AuthApi.logout();
    setAuthed(false);
    setAuthScreen('login');
  }

  // async function handleTheme(selectedTheme) {
  //   setTheme(selectedTheme);
  // }
  
  return (
    <SafeAreaProvider >
  
      <PaperProvider theme={theme}>
          <SafeAreaView
              style={{
                flex: 1,
                backgroundColor: theme.colors.background,
              }}
              edges={['top', 'left', 'right']}
          >
          {checking ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <ActivityIndicator />
            </View>
          ) : !authed ? (
            authScreen === 'login' ? (
              <LoginScreen
                onLoginSuccess={() => setAuthed(true)}
                onNavigateRegister={() => setAuthScreen('register')}
              />
            ) : (
              <RegisterScreen
                onRegisterSuccess={() => setAuthed(true)}
                onNavigateLogin={() => setAuthScreen('login')}
              />
            )
          ) : (
            <TabsShell onLogout={handleLogout} setTheme={setTheme} />
          )}
        </SafeAreaView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
