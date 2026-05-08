import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

const supabase = createClient(
  'https://lsquxrvufehselooyenj.supabase.co',
  'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'
);

export default function Matches() {
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyMatches = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: teamData } = await supabase.from('teams').select('id').eq('manager_id', user.id).maybeSingle();
        if (!teamData) return;

        const response = await fetch(`http://localhost:3000/api/matches?myTeamId=${teamData.id}`);
        const rawData = await response.json();

        const groupedMap = {};
        rawData.forEach(match => {
            const teamAName = match.team_a?.team_name || "Unknown";
            const teamBName = match.team_b?.team_name || "Practice";
            const fieldName = match.field_availabilities?.fields?.name || "Unknown Field";
            const matchDate = new Date(match.field_availabilities.start_time).toLocaleDateString('en-CA');
            const groupKey = `${teamAName}-${teamBName}-${fieldName}-${matchDate}`;

            if (!groupedMap[groupKey]) {
                groupedMap[groupKey] = {
                    id: match.id, team_a: match.team_a, team_b: match.team_b,
                    field: match.field_availabilities.fields, start_time: match.field_availabilities.start_time,
                    end_time: match.field_availabilities.end_time, duration_minutes: 30
                };
            } else {
                groupedMap[groupKey].duration_minutes += 30;
                if (new Date(match.field_availabilities.end_time) > new Date(groupedMap[groupKey].end_time)) {
                    groupedMap[groupKey].end_time = match.field_availabilities.end_time;
                }
            }
        });

        const groupedArray = Object.values(groupedMap).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        setMatches(groupedArray);
      } catch (err) { alert("Error fetching schedule."); } finally { setLoading(false); }
    };
    fetchMyMatches();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
          <Text style={styles.title}>My Schedule</Text>
          <Text style={styles.subtitle}>Upcoming matches and practices</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 50}} /> : (
        <FlatList 
          contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 100}}
          data={matches} 
          keyExtractor={i => i.id.toString()} 
          ListEmptyComponent={
              <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyStateText}>Your calendar is clear.</Text>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/search')}>
                      <Text style={{color: '#fff', fontWeight: 'bold'}}>Book a Field Now</Text>
                  </TouchableOpacity>
              </View>
          }
          renderItem={({ item }) => {
            const startDate = new Date(item.start_time);
            const isPractice = !item.team_b;
            
            return (
              <View style={styles.matchCard}>
                {/* LEFT: Date Block */}
                <View style={[styles.dateBlock, {backgroundColor: isPractice ? '#FFF3E0' : '#E8F0FE'}]}>
                    <Text style={[styles.monthText, {color: isPractice ? '#EF6C00' : '#1A73E8'}]}>{startDate.toLocaleString('en-US', {month: 'short'}).toUpperCase()}</Text>
                    <Text style={[styles.dayText, {color: isPractice ? '#EF6C00' : '#1A73E8'}]}>{startDate.getDate()}</Text>
                </View>

                {/* RIGHT: Content */}
                <View style={styles.contentBlock}>
                    <View style={styles.cardTop}>
                        <Text style={styles.teamText} numberOfLines={1}>{item.team_a?.team_name}</Text>
                        <Text style={styles.vsText}>{isPractice ? '' : 'vs'}</Text>
                        <Text style={[styles.teamText, {color: isPractice ? '#888' : '#111'}]} numberOfLines={1}>
                            {isPractice ? 'Practice' : item.team_b?.team_name}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="location" size={14} color="#888" style={{marginRight: 5}}/>
                        <Text style={styles.infoText}>{item.field?.name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="time" size={14} color="#888" style={{marginRight: 5}}/>
                        <Text style={styles.infoText}>
                            {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ({item.duration_minutes} min)
                        </Text>
                    </View>
                </View>
              </View>
            );
          }} 
        />
      )}

      {/* --- FLOATING BOTTOM NAV BAR --- */}
      <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/search')}>
              <Ionicons name="home-outline" size={24} color="#888" />
              <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
              <Ionicons name="calendar" size={24} color="#1A73E8" />
              <Text style={[styles.navText, {color: '#1A73E8'}]}>Matches</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/manage-roster')}>
              <Ionicons name="people-outline" size={24} color="#888" />
              <Text style={styles.navText}>Roster</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/')}>
              <Ionicons name="log-out-outline" size={24} color="#dc3545" />
              <Text style={styles.navText}>Logout</Text>
          </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  headerContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
  title: { fontSize: 32, fontWeight: '800', color: '#111' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  
  matchCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 15, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  
  dateBlock: { width: 80, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  monthText: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  dayText: { fontSize: 28, fontWeight: '800', marginTop: -2 },
  
  contentBlock: { flex: 1, padding: 15, justifyContent: 'center' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  teamText: { fontSize: 18, fontWeight: 'bold', color: '#111', flexShrink: 1 },
  vsText: { fontSize: 14, fontWeight: 'bold', color: '#dc3545', marginHorizontal: 8 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  infoText: { fontSize: 14, color: '#555', fontWeight: '500' },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyStateText: { fontSize: 18, color: '#888', marginTop: 10, fontWeight: '500', marginBottom: 20 },
  actionBtn: { backgroundColor: '#1A73E8', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },

  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, paddingBottom: Platform.OS === 'ios' ? 30 : 15, borderTopWidth: 1, borderTopColor: '#EEE' },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 11, fontWeight: '600', color: '#888', marginTop: 4 }
});
