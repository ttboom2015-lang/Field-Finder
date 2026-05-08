import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lsquxrvufehselooyenj.supabase.co',
  'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'
);

export default function ManageRoster() {
  const router = useRouter();
  const [teamId, setTeamId] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manual Invite States
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadRoster();
  }, []);

    const loadRoster = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Get the Manager's Team ID
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, team_name')
        .eq('manager_id', user.id)
        .maybeSingle();

      if (teamError) throw teamError;
      if (!teamData) {
        alert("You do not have a team set up yet.");
        router.replace('/create-team');
        return;
      }
      setTeamId(teamData.id);

      // 2. Fetch members with a simpler join
      const { data: rosterData, error: rosterError } = await supabase
        .from('team_members')
        .select(`
            id, 
            member_name, 
            status, 
            user_id, 
            profiles!team_members_user_id_fkey (email)
        `)
        .eq('team_id', teamData.id);

      if (rosterError) throw rosterError;
      setMembers(rosterData || []);

    } catch (err) {
      console.error("Roster Load Error:", err);
      // This will now show the SPECIFIC database error in your alert
      alert("Database Error: " + err.message); 
    } finally {
      setLoading(false);
    }
  };


  const updateStatus = async (memberId, newStatus) => {
    try {
      if (newStatus === 'rejected') {
          // If rejected, delete the row entirely so they can try again if it was a mistake
          await supabase.from('team_members').delete().eq('id', memberId);
      } else {
          // Approve them
          await supabase.from('team_members').update({ status: newStatus }).eq('id', memberId);
      }
      loadRoster(); // Refresh the list
    } catch (err) {
      alert("Error updating status.");
    }
  };

  const handleManualInvite = async () => {
    if (!inviteEmail) { alert("Please enter an email address."); return; }
    setInviting(true);

    try {
        // 1. Check if this email actually has an account in the profiles table
        const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('email', inviteEmail.toLowerCase())
            .maybeSingle();

        if (!profileData) {
            alert("No account found with this email. The parent must create an account first.");
            setInviting(false);
            return;
        }

        // 2. Add them directly as an APPROVED member
        const { error } = await supabase.from('team_members').insert([{
            team_id: teamId,
            user_id: profileData.id,
            member_name: profileData.full_name || inviteEmail,
            role: 'parent',
            status: 'approved'
        }]);

        if (error) throw error;

        alert("Parent successfully added to the roster!");
        setInviteEmail('');
        loadRoster();

    } catch (err) {
        alert("This person is already on your roster or another error occurred.");
    } finally {
        setInviting(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#007bff" style={{marginTop: 50}} />;

  const pendingMembers = members.filter(m => m.status === 'pending');
  const approvedMembers = members.filter(m => m.status === 'approved');

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <View>
            <Text style={styles.header}>Manage Roster</Text>
            <TouchableOpacity onPress={() => router.replace('/search')}>
                <Text style={{color: '#007bff', fontWeight: 'bold', marginTop: 5}}>← Back to Dashboard</Text>
            </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/')}>
            <Text style={{color:'#fff'}}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* --- MANUAL INVITE SECTION --- */}
      <View style={styles.card}>
        <Text style={styles.subHeader}>Manually Add Parent</Text>
        <Text style={{color: '#666', marginBottom: 10}}>If they have an account, enter their email to instantly add them to the team.</Text>
        
        <View style={styles.inviteRow}>
            <TextInput 
                style={styles.input} 
                placeholder="parent@email.com" 
                value={inviteEmail} 
                onChangeText={setInviteEmail} 
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TouchableOpacity style={styles.inviteBtn} onPress={handleManualInvite} disabled={inviting}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>{inviting ? 'Adding...' : 'Add'}</Text>
            </TouchableOpacity>
        </View>
      </View>

      {/* --- PENDING REQUESTS --- */}
      {pendingMembers.length > 0 && (
          <View style={{marginBottom: 20}}>
              <Text style={[styles.subHeader, {color: '#d39e00'}]}>Pending Requests ({pendingMembers.length})</Text>
              {pendingMembers.map(member => (
                  <View key={member.id} style={[styles.memberCard, { borderLeftColor: '#ffc107' }]}>
                      <View style={{flex: 1}}>
                          <Text style={styles.memberName}>{member.member_name}</Text>
                          <Text style={styles.memberEmail}>{member.profiles?.email}</Text>
                      </View>
                      <View style={{flexDirection: 'row', gap: 10}}>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(member.id, 'approved')}>
                              <Text style={{color: '#28a745', fontWeight: 'bold'}}>✅ Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(member.id, 'rejected')}>
                              <Text style={{color: '#dc3545', fontWeight: 'bold'}}>❌ Reject</Text>
                          </TouchableOpacity>
                      </View>
                  </View>
              ))}
          </View>
      )}

      {/* --- APPROVED ROSTER --- */}
      <Text style={styles.subHeader}>Current Roster ({approvedMembers.length})</Text>
      {approvedMembers.length === 0 ? (
          <Text style={{color: '#666'}}>No parents have been added yet.</Text>
      ) : (
          approvedMembers.map(member => (
              <View key={member.id} style={[styles.memberCard, { borderLeftColor: '#28a745' }]}>
                  <View style={{flex: 1}}>
                      <Text style={styles.memberName}>{member.member_name}</Text>
                      <Text style={styles.memberEmail}>{member.profiles?.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => updateStatus(member.id, 'rejected')}>
                      <Text style={{color: '#dc3545', fontSize: 12}}>Remove</Text>
                  </TouchableOpacity>
              </View>
          ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f4f6f9' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#343a40' },
  logoutBtn: { backgroundColor: '#dc3545', padding: 8, borderRadius: 5 },
  subHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 20, elevation: 2 },
  inviteRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, backgroundColor: '#f9f9f9', marginRight: 10 },
  inviteBtn: { backgroundColor: '#007bff', padding: 12, borderRadius: 8, justifyContent: 'center' },

  memberCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1, borderLeftWidth: 5 },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  memberEmail: { fontSize: 14, color: '#666', marginTop: 2 },
  actionBtn: { backgroundColor: '#f8f9fa', padding: 8, borderRadius: 5, borderWidth: 1, borderColor: '#ddd' }
});
