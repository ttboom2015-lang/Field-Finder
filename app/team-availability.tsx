import React, { useState, useEffect, createElement } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, Platform, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');

// Helper to get local date string YYYY-MM-DD
const getLocalYYYYMMDD = (date) => {
  const y = date.getFullYear(); 
  const m = String(date.getMonth() + 1).padStart(2, '0'); 
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function TeamAvailability() {
  const router = useRouter();
  const [teamId, setTeamId] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date States
  const [currentDateStr, setCurrentDateStr] = useState(getLocalYYYYMMDD(new Date()));
  const [bulkStartStr, setBulkStartStr] = useState(getLocalYYYYMMDD(new Date()));
  const [bulkEndStr, setBulkEndStr] = useState(getLocalYYYYMMDD(new Date()));
  const [bulkStatus, setBulkStatus] = useState('available');
  const [bulkLoading, setBulkLoading] = useState(false);

  // --- CORE LOGIC: GENERATE 36 SLOTS ---
  const generateDailySlots = (dateStr) => {
    const dailySlots = [];
    const [y, m, d] = dateStr.split('-').map(Number);
    for (let hour = 6; hour < 24; hour++) {
      // Create slots specifically using local hours
      const s = new Date(y, m - 1, d, hour, 0, 0, 0);
      const e = new Date(y, m - 1, d, hour, 30, 0, 0);
      const s2 = new Date(y, m - 1, d, hour, 30, 0, 0);
      const e2 = new Date(y, m - 1, d, hour + 1, 0, 0, 0);
      
      dailySlots.push({ start: s, end: e });
      dailySlots.push({ start: s2, end: e2 });
    }
    return dailySlots;
  };

  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('teams').select('id, team_name').eq('manager_id', user.id).maybeSingle();
            if (data) { setTeamId(data.id); setTeamName(data.team_name); }
            else { alert("Please create a team profile first."); router.replace('/create-team'); }
        }
    };
    init();
  }, []);

  useEffect(() => { if (teamId) loadSlots(); }, [currentDateStr, teamId]);

  const loadSlots = async () => {
    setLoading(true);
    try {
      // Precise boundaries for the selected day
      const startOfDay = new Date(`${currentDateStr}T00:00:00`).toISOString();
      const endOfDay = new Date(`${currentDateStr}T23:59:59`).toISOString();

      const response = await fetch(`https://fieldfinder-api.onrender.com/api/team-schedule?teamId=${teamId}&date=${currentDateStr}`);
      const existingAvails = await response.json();

      const generated = generateDailySlots(currentDateStr);
      const mergedSlots = generated.map(genSlot => {
        const dbSlot = existingAvails?.find(db => new Date(db.start_time).getTime() === genSlot.start.getTime());
        return {
          db_id: dbSlot?.id || null,
          start_time: genSlot.start,
          end_time: genSlot.end,
          status: dbSlot?.status || 'unavailable'
        };
      });
      setSlots(mergedSlots);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // --- BULK UPDATE FIX ---
  const applyBulkUpdate = async () => {
    if (!teamId) return;
    setBulkLoading(true);
    try {
      // 1. Precise ISO boundaries for range
      const sISO = new Date(`${bulkStartStr}T00:00:00`).toISOString();
      const eISO = new Date(`${bulkEndStr}T23:59:59`).toISOString();

      // 2. Fetch what already exists in that range
      const { data: existing } = await supabase.from('team_availabilities')
        .select('id, start_time')
        .eq('team_id', teamId)
        .gte('start_time', sISO)
        .lte('start_time', eISO);

      const existingMap = {};
      existing?.forEach(e => {
        existingMap[new Date(e.start_time).toISOString()] = e.id;
      });

      const toInsert = [];
      const toUpdateIds = [];

      // 3. Iterate through every day in the range
      let cursor = new Date(`${bulkStartStr}T12:00:00`); // Mid-day to avoid day-flip bugs
      const endDateObj = new Date(`${bulkEndStr}T12:00:00`);

      while (cursor <= endDateObj) {
        const dStr = getLocalYYYYMMDD(cursor);
        const daySlots = generateDailySlots(dStr);

        daySlots.forEach(slot => {
          const isoStart = slot.start.toISOString();
          if (existingMap[isoStart]) {
            toUpdateIds.push(existingMap[isoStart]);
          } else {
            toInsert.push({
              team_id: teamId,
              start_time: isoStart,
              end_time: slot.end.toISOString(),
              status: bulkStatus
            });
          }
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      // 4. Send to Backend
      const response = await fetch('https://fieldfinder-api.onrender.com/api/team-schedule/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toInsert, toUpdateIds, status: bulkStatus })
      });

      if (response.ok) {
          alert(`Bulk update successful!`);
          loadSlots(); // Refresh UI
      } else {
          alert("Failed to apply bulk update.");
      }
    } catch (err) {
        console.error(err);
        alert("Network Error during bulk update.");
    } finally {
        setBulkLoading(false);
    }
  };

  const toggleSlotStatus = async (index) => {
    const slot = slots[index];
    let newStatus = 'available';
    if (slot.status === 'available') newStatus = 'booked';
    else if (slot.status === 'booked') newStatus = 'unavailable';

    const updatedSlots = [...slots];
    updatedSlots[index].status = newStatus;
    setSlots(updatedSlots);

    const payload = slot.db_id 
        ? { toUpdateIds: [slot.db_id], status: newStatus }
        : { toInsert: [{ team_id: teamId, start_time: slot.start_time.toISOString(), end_time: slot.end_time.toISOString(), status: newStatus }] };

    await fetch('https://fieldfinder-api.onrender.com/api/team-schedule/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    
    if (!slot.db_id) loadSlots(); // Refresh to get the ID for next click
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{teamName} Schedule</Text>
        <View style={{width: 40}}/>
      </View>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* JUMP TO DATE */}
        <View style={styles.toolsCard}>
          <Text style={styles.toolHeader}>📅 Jump to Date</Text>
          {Platform.OS === 'web' && createElement('input', { 
              type: 'date', value: currentDateStr, 
              onChange: (e) => setCurrentDateStr(e.target.value), 
              style: styles.webDate 
          })}
        </View>

        {/* BULK UPDATER */}
        <View style={[styles.toolsCard, { backgroundColor: '#E3F2FD', borderColor: '#BBDEFB' }]}>
          <Text style={[styles.toolHeader, {color: '#1565C0'}]}>⚡ Bulk Availability Update</Text>
          <Text style={{color: '#666', fontSize: 12, marginBottom: 10}}>Set all 36 slots for a range of dates:</Text>
          
          {Platform.OS === 'web' && (
            <View style={styles.bulkRow}>
              <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.smallLabel}>From:</Text>
                  {createElement('input', { type: 'date', value: bulkStartStr, onChange: (e) => setBulkStartStr(e.target.value), style: styles.webDate })}
              </View>
              <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.smallLabel}>To:</Text>
                  {createElement('input', { type: 'date', value: bulkEndStr, onChange: (e) => setBulkEndStr(e.target.value), style: styles.webDate })}
              </View>
              <View style={{flex: 1.2, marginRight: 8}}>
                  <Text style={styles.smallLabel}>Status:</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={bulkStatus} onValueChange={setBulkStatus}>
                        <Picker.Item label="Available" value="available" />
                        <Picker.Item label="Unavailable" value="unavailable" />
                        <Picker.Item label="Busy / Booked" value="booked" />
                    </Picker>
                  </View>
              </View>
              <TouchableOpacity style={styles.applyBtn} onPress={applyBulkUpdate} disabled={bulkLoading}>
                  {bulkLoading ? <ActivityIndicator color="#fff" size="small"/> : <Text style={styles.applyBtnTxt}>Apply</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* DATE DISPLAY */}
        <View style={styles.dateDisplayCard}>
            <Text style={styles.dateDisplayText}>
                {new Date(`${currentDateStr}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
        </View>

        <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#28a745'}]}/><Text style={styles.legendTxt}>Available</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#ffc107'}]}/><Text style={styles.legendTxt}>Unknown</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#dc3545'}]}/><Text style={styles.legendTxt}>Booked</Text></View>
        </View>

        {loading ? <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 40}}/> : (
          <View style={{paddingBottom: 60}}>
            {slots.map((item, index) => {
              const timeStr = item.start_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
              let bgColor = '#FFF3CD'; // Yellow
              if (item.status === 'available') bgColor = '#D4EDDA'; // Green
              if (item.status === 'booked') bgColor = '#F8D7DA'; // Red

              return (
                <View key={index} style={[styles.slotRow, { backgroundColor: bgColor }]}>
                  <Text style={styles.timeTxt}>{timeStr}</Text>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => toggleSlotStatus(index)}>
                    <Text style={styles.actionBtnTxt}>
                        {item.status === 'unavailable' ? 'UNKNOWN' : item.status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  container: { padding: 15 },
  
  toolsCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#EEE' },
  toolHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#1A73E8' },
  smallLabel: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 4 },
  webDate: { padding: 10, borderRadius: 8, border: '1px solid #DDD', width: '100%', backgroundColor: '#F1F3F4', fontSize: 14 },
  
  bulkRow: { flexDirection: 'row', alignItems: 'flex-end' },
  pickerWrapper: { backgroundColor: '#F1F3F4', borderRadius: 8, height: 40, justifyContent: 'center', borderWidth: 1, borderColor: '#DDD' },
  applyBtn: { backgroundColor: '#1A73E8', height: 40, paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center', marginLeft: 5 },
  applyBtnTxt: { color: '#fff', fontWeight: 'bold' },

  dateDisplayCard: { backgroundColor: '#343a40', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 4 },
  dateDisplayText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },

  legend: { flexDirection: 'row', justifyContent: 'space-around', padding: 12, backgroundColor: '#fff', borderRadius: 10, marginBottom: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendTxt: { fontSize: 12, fontWeight: '700', color: '#555' },

  slotRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  timeTxt: { flex: 1, fontSize: 17, fontWeight: 'bold', color: '#333' },
  actionBtn: { backgroundColor: 'rgba(255,255,255,0.7)', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', width: 110, alignItems: 'center' },
  actionBtnTxt: { fontSize: 12, fontWeight: '800', color: '#333' }
});
