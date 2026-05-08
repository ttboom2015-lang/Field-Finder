import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function Matches() {
  const router = useRouter();
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/matches')
      .then(res => res.json())
      .then(setMatches)
      .catch(err => alert("Error fetching matches"));
  }, []);

  const formatDate = (dateString) => new Date(dateString).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 15 }}>
        <Text style={{ color: '#007bff', fontWeight: 'bold', fontSize: 16 }}>← Back to Search</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Confirmed Matches Dashboard</Text>

      <FlatList 
        data={matches} 
        keyExtractor={i => i.id.toString()} 
        ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>No matches booked yet.</Text>}
        renderItem={({ item }) => {
          const field = item.field_availabilities.fields;
          const teamA = item.team_a;
          const teamB = item.team_b ? item.team_b.team_name : "Practice (No Opponent)";

          return (
            <View style={styles.matchCard}>
              <View style={styles.matchHeader}>
                <Text style={styles.teamName}>{teamA.team_name}</Text>
                <Text style={styles.vs}> VS </Text>
                <Text style={styles.teamName}>{teamB}</Text>
              </View>
              
              <View style={styles.detailsBox}>
                <Text style={styles.detailText}>📍 {field.name}</Text>
                <Text style={styles.detailText}>📅 {formatDate(item.field_availabilities.start_time)}</Text>
                <Text style={styles.detailText}>⚙️ {field.sport} | {field.format} | {teamA.age_group} {teamA.division}</Text>
              </View>
            </View>
          );
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f2f5' },
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  matchCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 15, elevation: 3, borderLeftWidth: 6, borderLeftColor: '#007bff' },
  matchHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  teamName: { fontSize: 20, fontWeight: 'bold', color: '#222', flex: 1, textAlign: 'center' },
  vs: { fontSize: 18, fontWeight: 'bold', color: '#dc3545', marginHorizontal: 10 },
  detailsBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 8 },
  detailText: { fontSize: 16, color: '#555', marginBottom: 5, fontWeight: '500' }
});