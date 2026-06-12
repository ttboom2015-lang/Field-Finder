import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';


const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');

export default function PendingInvites() {
  const router = useRouter();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for responding
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadInvites = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: teamData } = await supabase.from('teams').select('id').eq('manager_id', user.id).maybeSingle();
        if (!teamData) return;

        const response = await fetch(`${API_BASE_URL}/api/pending-invites?teamId=${teamData.id}`);

        const data = await response.json();
        setInvites(data || []);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    loadInvites();
  }, []);

  const handleResponse = async (status) => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/respond-invite`, {

        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: activeMatchId, responseStatus: status, responseNotes })
      });
      if (response.ok) {
          alert(`Match ${status}!`);
          setActiveMatchId(null);
          setResponseNotes('');
          
          // Check if there are any invites left
          const remaining = invites.filter(i => i.id !== activeMatchId);
          setInvites(remaining);
          
          // If no more invites, send them to dashboard
          if (remaining.length === 0) router.replace('/search');
      }
    } catch (err) { alert("Network Error"); } finally { setProcessing(false); }
  };

  if (loading) return <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 50}} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/search')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Pending Invites ({invites.length})</Text>
        <View style={{width: 40}} /> 
      </View>

      {invites.length === 0 ? (
          <View style={styles.emptyState}>
              <Ionicons name="mail-open-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>You have no pending match invitations.</Text>
              <TouchableOpacity style={styles.btn} onPress={() => router.replace('/search')}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>Go to Dashboard</Text>
              </TouchableOpacity>
          </View>
      ) : (
          <FlatList
            contentContainerStyle={{padding: 20}}
            data={invites}
            keyExtractor={i => i.id.toString()}
            renderItem={({ item }) => {
                const d = new Date(item.field_availabilities.start_time);
                const isResponding = activeMatchId === item.id;

                return (
                    <View style={styles.card}>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}>
                            <View style={styles.avatar}><Ionicons name="shield" size={24} color="#F59E0B"/></View>
                            <View style={{marginLeft: 15, flex: 1}}>
                                <Text style={styles.teamName}>{item.team_a.team_name}</Text>
                                <Text style={{color: '#666'}}>Manager: {item.team_a.manager_name}</Text>
                            </View>
                        </View>

                        <View style={styles.detailsBox}>
                            <Text style={styles.detailTxt}>📍 {item.field_availabilities.fields.name}</Text>
                            <Text style={styles.detailTxt}>📅 {d.toLocaleDateString('en-CA', {weekday: 'short', month: 'short', day: 'numeric'})} @ {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                            <Text style={styles.detailTxt}>⚙️ {item.field_availabilities.fields.sport} | {item.field_availabilities.fields.format}</Text>
                        </View>

                        {item.invite_notes && (
                            <View style={styles.notesBox}>
                                <Text style={{fontWeight: 'bold', fontSize: 12, color: '#555'}}>Note from opponent:</Text>
                                <Text style={{fontStyle: 'italic', marginTop: 4}}>{item.invite_notes}</Text>
                            </View>
                        )}

                        {isResponding ? (
                            <View style={{marginTop: 15}}>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Add a note (e.g. Thanks! See you there.)" 
                                    value={responseNotes} 
                                    onChangeText={setResponseNotes} 
                                    multiline 
                                />
                                <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#10B981'}]} onPress={() => handleResponse('confirmed')} disabled={processing}>
                                        <Text style={{color: '#fff', fontWeight: 'bold'}}>Accept Match</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#EF4444'}]} onPress={() => handleResponse('declined')} disabled={processing}>
                                        <Text style={{color: '#fff', fontWeight: 'bold'}}>Decline</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={() => setActiveMatchId(null)} style={{alignItems: 'center', marginTop: 15}}>
                                    <Text style={{color: '#666'}}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.respondBtn} onPress={() => setActiveMatchId(item.id)}>
                                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>Respond to Invite</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            }}
          />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { fontSize: 16, color: '#666', marginTop: 15, marginBottom: 25 },
  btn: { backgroundColor: '#1A73E8', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 3, marginBottom: 20 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  teamName: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  detailsBox: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, marginBottom: 15 },
  detailTxt: { fontSize: 14, color: '#333', marginBottom: 5, fontWeight: '500' },
  notesBox: { backgroundColor: '#F0F9FF', padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  respondBtn: { backgroundColor: '#1A73E8', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  input: { backgroundColor: '#F1F3F4', padding: 15, borderRadius: 12, height: 80, textAlignVertical: 'top' },
  actionBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' }
});
