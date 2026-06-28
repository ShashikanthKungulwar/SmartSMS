import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, InteractionManager } from 'react-native';
import { requestSmsPermissions } from './src/permissions/SmsPermission';
import { getSmsFromInbox, Sms } from './src/native/SmsNative';

export default function App() {
  const [smsList, setSmsList] = useState<Sms[]>([]);
  const [status, setStatus]   = useState('Loading...');

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      init();
    });
    return () => task.cancel();
  }, []);

  async function init() {
    try {
      const granted = await requestSmsPermissions();
      if (!granted) { setStatus('Permissions denied'); return; }
      const messages = await getSmsFromInbox(20);
      setSmsList(messages);
      setStatus(`${messages.length} messages loaded`);
    } catch (e: any) {
      setStatus('Error: ' + e.message);
      console.error(e);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>
      <FlatList
        data={smsList}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.sender}>{item.address}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  status:    { fontSize: 14, marginBottom: 12, color: '#555' },
  card:      { padding: 12, marginBottom: 8, backgroundColor: '#f4f4f4', borderRadius: 8 },
  sender:    { fontWeight: 'bold', marginBottom: 4 },
  body:      { color: '#333', fontSize: 13 },
});