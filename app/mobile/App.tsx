import React, { useEffect, useState } from 'react';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { AuthApi } from './src/api/auth';
import { triggerCleanNow, onSmsReceived } from './src/native/SmsNative';
import { classifySms } from './src/native/SmsNative';

// import { AuthApi } from './src/api/auth';

// inside your home screen component

import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, TextInput, InteractionManager, ActivityIndicator
} from 'react-native';
import { requestSmsPermissions } from './src/permissions/SmsPermission';
import { useSms } from './src/hooks/useSms';


type Screen = 'login' | 'register' | 'home';


export default function App() {
  
  const { smsList, loading, error, load, deleteSms, search } = useSms();
  const [screen, setScreen] = useState<Screen>('login');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    AuthApi.isLoggedIn().then(loggedIn => {
      setScreen(loggedIn ? 'home' : 'login');
      setChecking(false);
    });
  }, [load]);


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


  if (checking) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  }

  if (screen === 'login') {
    return <LoginScreen onLoginSuccess={() => setScreen('home')} onNavigateRegister={() => setScreen('register')} />;
  }

  if (screen === 'register') {
    return <RegisterScreen onRegisterSuccess={() => setScreen('home')} onNavigateLogin={() => setScreen('login')} />;
  }

//   return (
//   <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
//     <TouchableOpacity
//       onPress={() => console.log('CLICKED!!!')}
//       style={{ backgroundColor: 'red', padding: 30 }}
//     >
//       <Text style={{ color: 'white', fontSize: 20 }}>TEST BUTTON</Text>
//     </TouchableOpacity>
//   </View>
// );

  return (
    <View style={styles.container}>
      

      {/* <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}> 
       <TouchableOpacity
         onPress={async () => {
          console.log('Logout pressed');
          await AuthApi.logout();
          setScreen('login');
         }}
         style={{ backgroundColor: 'red', padding: 30 }}
       >
         <Text style={{ color: 'white', fontSize: 20 }}>TEST BUTTON</Text>
       </TouchableOpacity>
     </View> */}


  <View style={[styles.header, { zIndex: 10, elevation: 10 }]}>
    <Text style={styles.title}>SmartSMS</Text>
    <TouchableOpacity
      onPress={async () => {
        console.log('Logout pressed');
        await AuthApi.logout();
        setScreen('login');
      }}
      style={styles.logoutBtn}
    >
      <Text style={styles.logout}>Logout</Text>
    </TouchableOpacity>

    
    <TouchableOpacity
      onPress={async () => {
        const samples = [
          "Your OTP is 4521. Valid for 10 minutes.",
          "Rs.5000 debited from A/c XX1234. Bal: Rs.20000",
          "MEGA SALE! 50% off at Amazon today",
        ];
        // warmup
        await classifySms(samples[0]);
        // measure
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
        console.log(`On-device latency — p50: ${p50}ms, p95: ${p95}ms`);
      }}
      style={{ padding: 10, backgroundColor: '#185FA5', borderRadius: 8, margin: 8 }}
>
      <Text style={{ color: '#fff', textAlign: 'center' }}>Benchmark Model</Text>
    </TouchableOpacity>


    <TouchableOpacity
    onPress={async () => {
      await triggerCleanNow();
      console.log('Clean job triggered');
      setTimeout(() => load(), 2000);
      }}
      style={{ padding: 10, backgroundColor: '#1D9E75', borderRadius: 8, margin: 8 }}
      >
      <Text style={{ color: '#fff', textAlign: 'center' }}>Run Clean Now</Text>
    </TouchableOpacity>
  </View>

  <TextInput
    style={styles.search}
    placeholder="Search messages..."
    onChangeText={search}
    placeholderTextColor="#999"
  />
  {loading && <ActivityIndicator style={{ margin: 12 }} />}
  {error && <Text style={styles.error}>{error}</Text>}
  <FlatList
    data={smsList}
    keyExtractor={item => item.id}
    renderItem={({ item }) => (
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.sender}>{item.address}</Text>
          <TouchableOpacity onPress={() => {
            console.log("Button pressed", item.id);
            deleteSms(item.id);
          }}>
            <Text style={styles.del}>Delete</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    )}
    />
  </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title:     { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  search:    { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 14 },
  card:      { padding: 12, marginBottom: 8, backgroundColor: '#f4f4f4', borderRadius: 8 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sender:    { fontWeight: 'bold', fontSize: 13 },
  del:       { color: 'red', fontSize: 12 },
  body:      { color: '#333', fontSize: 13 },
  error:     { color: 'red', fontSize: 12, marginBottom: 8 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logoutBtn: { padding: 8 },
  logout:    { color: '#1D9E75', fontSize: 14, fontWeight: '600' },
});