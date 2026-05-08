import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lsquxrvufehselooyenj.supabase.co',
  'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'
);

export default function JoinTeam() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchTeams = async () => {
    if (searchQuery.length < 3) {
        alert("Please enter at least 3 characters to search.");
        return;
    }
    setLoading(true);
    const { data, error } = await supabase
        .from('teams')
        .select('id, team_name, age_group, division')
        .ilike('team_name', `%${searchQuery}%`);
    
    setTeams(data || []);
    setLoading(false);
  };

  const requestToJoin = async (teamId) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('team_members').insert([{
        team_id: teamId,
        user_id: user.id,
        member_name: user.email, // We can ask for name later
        role: 'parent',
        status: 'pending'
    }]);

    if (error) alert("You have already requested to join this team.");
    else {
        alert("Request sent! Please wait for the manager to approve you.");
        router.replace('/parent-dashboard');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Find Your Team</Text>
      <View style={styles.searchRow}>
        <TextInput 
            style={styles.input} 
            placeholder="Search Team Name (e.g. Lions)" 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchTeams}>
            <Text style={{color: '#fff', fontWeight: 'bold'}}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" /> : (
        <FlatList 
            data={teams}
            keyExtractor={i => i.id}
            renderItem={({ item }) => (
                <View style={styles.teamCard}>
                    <View>
                        <Text style={styles.teamTitle}>{item.team_name}</Text>
                        <Text style={{color: '#666'}}>{item.age_group} | {item.division}</Text>
                    </View>
                    <TouchableOpacity style={styles.joinBtn} onPress={() => requestToJoin(item.id)}>
                        <Text style={{color: '#fff', fontWeight: 'bold'}}>Join</Text>
                    </TouchableOpacity>
                </View>
            )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f9' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  searchRow: { flexDirection: 'row', marginBottom: 20 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, backgroundColor: '#fff' },
  searchBtn: { backgroundColor: '#007bff', padding: 12, marginLeft: 10, borderRadius: 8, justifyContent: 'center' },
  teamCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10 },
  teamTitle: { fontSize: 18, fontWeight: 'bold' },
  joinBtn: { backgroundColor: '#28a745', padding: 10, borderRadius: 5 }
});
