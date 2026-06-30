import React, { useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, TextInput, InteractionManager, ActivityIndicator
} from 'react-native';
import { requestSmsPermissions } from './src/permissions/SmsPermission';
import { useSms } from './src/hooks/useSms';

export default function App() {
  console.log("App rendered");
  const { smsList, loading, error, load, deleteSms, search } = useSms();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      const granted = await requestSmsPermissions();
      if (granted) load();
    });
    return () => task.cancel();
  }, [load]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SmartSMS</Text>
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
});