import React, { useEffect, useState } from 'react';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { AuthApi } from './src/api/auth';
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


  <View sty le={[styles.header, { zIndex: 10, elevation: 10 }]}>
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