import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../config';

export default function AdminCalendar() {
  const router = useRouter();
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('\${API_BASE_URL}`/api/admin/calendar')
      .then(res => res.json())
      .then(setData)
      .catch(err => alert("Error fetching calendar"));
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 15 }}>
        <Text style={{ color: '#007bff', fontWeight: 'bold' }}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Admin Calendar Synchronization</Text>
      
      <View style={styles.tableHeader}>
        <Text style={[styles.cell, { flex: 2 }]}>Field Name</Text>
        <Text style={styles.cell}>Status</Text>
        <Text style={[styles.cell, { flex: 2 }]}>Start Time</Text>
      </View>

      <FlatList data={data} keyExtractor={i => i.id.toString()} renderItem={({ item }) => (
        <View style={styles.tableRow}>
          <Text style={[styles.cell, { flex: 2 }]}>{item.fields.name}</Text>
          <Text style={[styles.cell, { color: item.status === 'booked' ? 'red' : 'green' }]}>{item.status.toUpperCase()}</Text>
          <Text style={[styles.cell, { flex: 2 }]}>{new Date(item.start_time).toLocaleString()}</Text>
        </View>
      )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#343a40', padding: 10, borderRadius: 5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ccc', padding: 10 },
  cell: { flex: 1, fontWeight: 'bold', color: '#333' }
});