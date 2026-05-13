import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');

export default function ClubAvailabilities() {
  const router = useRouter();
  const { fieldId, fieldName, startDate, endDate, startTime, endTime, weekendsOnly } = useLocalSearchParams(); 
  
  const [myTeamId, setMyTeamId] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: teamData } = await supabase.from('teams').select('id').eq('manager_id', user.id).single();
        if (teamData) setMyTeamId(teamData.id);
      }

      const queryStart = startDate ? new Date(`${startDate}T00:00:00`).toISOString() : new Date().toISOString();
      const queryEnd = endDate ? new Date(`${endDate}T23:59:59`).toISOString() : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

      const { data: availData } = await supabase
        .from('field_availabilities')
        .select('*').eq('field_id', fieldId).eq('status', 'available').gte('start_time', queryStart).lte('start_time', queryEnd).order('start_time', { ascending: true });

      let finalSlots = availData || [];

      // NEW: Apply the Weekend Filter if checked on the previous page
      if (weekendsOnly === 'true') {
          finalSlots = finalSlots.filter(slot => {
              const day = new Date(slot.start_time).getDay();
              return day === 0 || day === 6; // Sunday or Saturday
          });
      }

      // Apply the Time Range filter
      if (startTime && endTime) {
        const sHour = parseInt(startTime.split(':')[0]);
        const eHour = parseInt(endTime.split(':')[0]);
        finalSlots = finalSlots.filter(slot => {
          const slotHour = new Date(slot.start_time).getHours();
          return slotHour >= sHour && slotHour <= eHour;
        });
      }
      setSlots(finalSlots);
      setLoading(false);
    };
    if (fieldId) loadData();
  }, [fieldId, startDate, endDate, startTime, endTime, weekendsOnly]);

  const toggleSlotSelection = (slotId) => {
      if (selectedSlots.includes(slotId)) setSelectedSlots(selectedSlots.filter(id => id !== slotId)); 
      else setSelectedSlots([...selectedSlots, slotId]); 
  };

  const bookSelectedSlots = async () => {
      if (!myTeamId) { alert("Create a team profile first!"); return; }
      if (selectedSlots.length === 0) return;
      try {
        const response = await fetch('http://localhost:3000/api/book-match', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ availabilityIds: selectedSlots, myTeamId, opponentTeamId: null })
        });
        if (response.ok) { 
          if (window.confirm(`Success! You booked ${selectedSlots.length * 30} minutes.\n\nFind an opponent for this field now?`)) {
              router.replace('/teamfinder');
          } else { router.replace('/search'); }
        } else { 
          const result = await response.json(); alert("Booking failed: " + result.error); 
        }
      } catch (err) { alert("Network Error"); }
  };

  if (loading) return <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 50}} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/search')} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <View style={{flex: 1, marginLeft: 15}}>
            <Text style={styles.title} numberOfLines={1}>{fieldName}</Text>
            {startTime && endTime ? <Text style={styles.subtitle}>Showing {startTime} - {endTime} {weekendsOnly === 'true' ? '(Weekends)' : ''}</Text> : <Text style={styles.subtitle}>Select consecutive blocks</Text>}
        </View>
      </View>

      {slots.length === 0 ? (
        <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={60} color="#ccc" />
            <Text style={styles.emptyStateText}>No slots match your filters.</Text>
        </View>
      ) : (
        <FlatList 
          contentContainerStyle={{padding: 20, paddingBottom: 100}}
          data={slots} 
          keyExtractor={i => i.id.toString()} 
          renderItem={({ item }) => {
              const isSelected = selectedSlots.includes(item.id);
              const d = new Date(item.start_time);
              const dEnd = new Date(item.end_time);
              return (
                <TouchableOpacity style={[styles.slotCard, isSelected && styles.slotCardSelected]} onPress={() => toggleSlotSelection(item.id)}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Ionicons name={isSelected ? "checkmark-circle" : "time-outline"} size={24} color={isSelected ? "#1A73E8" : "#888"} style={{marginRight: 15}}/>
                      <View>
                          <Text style={[styles.slotDate, isSelected && styles.textBlue]}>{d.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
                          <Text style={styles.slotTime}>{d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {dEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                      </View>
                  </View>
                </TouchableOpacity>
              );
          }} 
        />
      )}

      {selectedSlots.length > 0 && (
          <View style={styles.bottomBar}>
              <View style={{flex: 1}}><Text style={styles.selectedCount}>{selectedSlots.length} slots selected</Text><Text style={styles.durationText}>{selectedSlots.length * 30} minutes total</Text></View>
              <TouchableOpacity style={styles.bookBtn} onPress={bookSelectedSlots}><Text style={styles.bookBtnTxt}>Reserve</Text><Ionicons name="arrow-forward" size={18} color="#fff" style={{marginLeft: 5}}/></TouchableOpacity>
          </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 13, color: '#1A73E8', fontWeight: '600', marginTop: 2 },
  slotCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0', elevation: 1 },
  slotCardSelected: { backgroundColor: '#E8F0FE', borderColor: '#1A73E8', borderWidth: 2 },
  slotDate: { fontSize: 16, fontWeight: '700', color: '#333' },
  textBlue: { color: '#1A73E8' },
  slotTime: { fontSize: 14, color: '#666', marginTop: 2, fontWeight: '500' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { fontSize: 16, color: '#888', marginTop: 10, fontWeight: '500' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', padding: 20, paddingBottom: Platform.OS === 'ios' ? 35 : 20, borderTopWidth: 1, borderTopColor: '#EEE', alignItems: 'center', elevation: 10 },
  selectedCount: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  durationText: { fontSize: 13, color: '#666', fontWeight: '500' },
  bookBtn: { backgroundColor: '#1A73E8', flexDirection: 'row', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  bookBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
