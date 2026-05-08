import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lsquxrvufehselooyenj.supabase.co',
  'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'
);

export default function ParentDashboard() {
  const router = useRouter();
  const [membership, setMembership] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadParentData(); }, []);

  const loadParentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Check membership
      const { data: memberData } = await supabase
        .from('team_members')
        .select('*, teams(id, team_name)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!memberData) {
        router.replace('/join-team');
        return;
      }
      setMembership(memberData);

      if (memberData.status === 'approved') {
        // 2. Fetch matches if approved
        const res = await fetch(`http://localhost:3000/api/matches?myTeamId=${memberData.team_id}`);
        const rawData = await res.json();
        
        // Grouping logic (re-used from your matches page)
        const groupedMap = {};
        rawData.forEach(match => {
            const groupKey = `${match.field_availabilities.fields.name}-${new Date(match.field_availabilities.start_time).toLocaleDateString()}`;
            if (!groupedMap[groupKey]) {
                groupedMap[groupKey] = { ...match, duration: 30 };
            } else {
                groupedMap[groupKey].duration += 30;
                // Update end time
                if (new Date(match.field_availabilities.end_time) > new Date(groupedMap[groupKey].field_availabilities.end_time)) {
                    groupedMap[groupKey].field_availabilities.end_time = match.field_availabilities.end_time;
                }
            }
        });
        setMatches(Object.values(groupedMap));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{marginTop: 50}} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Parent Portal</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/')}><Text style={{color:'#fff'}}>Logout</Text></TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.teamTitle}>Team: {membership?.teams?.team_name}</Text>
        <Text style={{color: membership?.status === 'approved' ? 'green' : 'orange', fontWeight: 'bold'}}>
           Status: {membership?.status.toUpperCase()}
        </Text>
      </View>

      {membership?.status !== 'approved' ? (
        <View style={styles.pendingBox}>
            <Text style={{textAlign: 'center', fontSize: 16}}>Your request is pending. Contact your team manager to approve your access.</Text>
        </View>
      ) : (
        <View>
            <Text style={styles.subHeader}>Upcoming Matches</Text>
            {matches.length === 0 ? <Text>No upcoming matches found.</Text> : (
                matches.map((item, idx) => (
                    <View key={idx} style={styles.matchCard}>
                        <Text style={styles.vsText}>{item.team_a.team_name} vs {item.team_b?.team_name || 'TBD'}</Text>
                        <View style={styles.details}>
                            <Text>📍 {item.field_availabilities.fields.name}</Text>
                            <Text>📅 {new Date(item.field_availabilities.start_time).toLocaleDateString('en-CA', {weekday: 'short', month: 'short', day: 'numeric'})}</Text>
                            <Text>⏰ {new Date(item.field_availabilities.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} ({item.duration} mins)</Text>
                        </View>
                    </View>
                ))
            )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f2f5' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 24, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#dc3545', padding: 8, borderRadius: 5 },
  statusCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 20, elevation: 2 },
  teamTitle: { fontSize: 18, fontWeight: 'bold' },
  pendingBox: { padding: 40, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center' },
  subHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  matchCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: '#28a745' },
  vsText: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  details: { gap: 5 }
});
