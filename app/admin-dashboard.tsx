import React, { useState, useEffect, createElement } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lsquxrvufehselooyenj.supabase.co',
  'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'
);

// Helper to get today's date safely as a string
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AdminDashboard() {
  const router = useRouter();
  const { fieldId, fieldName } = useLocalSearchParams(); 

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // BULLETPROOF DATE STATES: Storing raw strings (YYYY-MM-DD) instead of Date objects
  const [currentDateStr, setCurrentDateStr] = useState(getTodayStr());
  const [bulkStartStr, setBulkStartStr] = useState(getTodayStr());
  const [bulkEndStr, setBulkEndStr] = useState(getTodayStr());
  
  const [bulkStatus, setBulkStatus] = useState('available');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Generates exactly 36 slots for a specific string date
  const generateDailySlots = (dateStr) => {
    const dailySlots = [];
    const [y, m, d] = dateStr.split('-').map(Number);

    for (let hour = 6; hour < 24; hour++) {
      dailySlots.push({ start: new Date(y, m - 1, d, hour, 0), end: new Date(y, m - 1, d, hour, 30) });
      dailySlots.push({ start: new Date(y, m - 1, d, hour, 30), end: new Date(y, m - 1, d, hour + 1, 0) });
    }
    return dailySlots;
  };

  useEffect(() => { 
    if (fieldId) {
        loadSlots(); 
    } else {
        alert("No field selected.");
        router.replace('/admin-fields');
    }
  }, [currentDateStr, fieldId]);

  const loadSlots = async () => {
    setLoading(true);
    try {
      // Force local midnight to end of day using string interpolation
      const startOfDay = new Date(`${currentDateStr}T00:00:00`).toISOString();
      const endOfDay = new Date(`${currentDateStr}T23:59:59.999`).toISOString();

      const { data: existingAvails } = await supabase
        .from('field_availabilities')
        .select('*')
        .eq('field_id', fieldId) 
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay);

      const generated = generateDailySlots(currentDateStr);
      const mergedSlots = generated.map(genSlot => {
        const dbSlot = existingAvails?.find(db => new Date(db.start_time).getTime() === genSlot.start.getTime());
        return {
          db_id: dbSlot?.id || null,
          start_time: genSlot.start,
          end_time: genSlot.end,
          status: dbSlot?.status || 'unavailable',
          price: dbSlot?.price ? dbSlot.price.toString() : '50.00'
        };
      });
      setSlots(mergedSlots);
    } catch (err) { 
        console.error(err); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleSync = async () => {
    if (!fieldId) return;
    setSyncing(true);
    try {
        const res = await fetch('http://localhost:3000/api/sync-calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fieldId })
        });
        const data = await res.json();
        alert(data.message || data.error);
        loadSlots(); 
    } catch (err) {
        alert("Network error while syncing.");
    } finally {
        setSyncing(false);
    }
  };

  const applyBulkUpdate = async () => {
    if (!fieldId) return;
    setBulkLoading(true);
    try {
      const sDate = new Date(`${bulkStartStr}T00:00:00`);
      const eDate = new Date(`${bulkEndStr}T23:59:59.999`);

      const { data: existing } = await supabase.from('field_availabilities').select('id, start_time')
        .eq('field_id', fieldId).gte('start_time', sDate.toISOString()).lte('start_time', eDate.toISOString());

      const existingMap = {};
      existing?.forEach(e => { existingMap[new Date(e.start_time).toISOString()] = e.id; });

      const toInsert = [];
      const toUpdateIds = [];

      let curr = new Date(sDate);
      while (curr <= eDate) {
        const dStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
        const dailySlots = generateDailySlots(dStr);
        
        dailySlots.forEach(slot => {
          const isoStart = slot.start.toISOString();
          if (existingMap[isoStart]) {
            toUpdateIds.push(existingMap[isoStart]); 
          } else {
            toInsert.push({ field_id: fieldId, start_time: isoStart, end_time: slot.end.toISOString(), status: bulkStatus, price: 50.00 }); 
          }
        });
        curr.setDate(curr.getDate() + 1);
      }

      if (toInsert.length > 0) await supabase.from('field_availabilities').insert(toInsert);
      if (toUpdateIds.length > 0) await supabase.from('field_availabilities').update({ status: bulkStatus }).in('id', toUpdateIds);

      alert(`Success! Set ${toInsert.length + toUpdateIds.length} time slots to ${bulkStatus.toUpperCase()}.`);
      loadSlots(); 
    } catch (err) {
      alert("Bulk Update Error: " + err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSlotStatus = async (index) => {
    const slot = slots[index];
    const newStatus = slot.status === 'available' ? 'booked' : 'available';
    const updatedSlots = [...slots];
    updatedSlots[index].status = newStatus;
    setSlots(updatedSlots);

    if (slot.db_id) {
        await supabase.from('field_availabilities').update({ status: newStatus }).eq('id', slot.db_id);
    } else {
      const { data } = await supabase.from('field_availabilities').insert([{
        field_id: fieldId, start_time: slot.start_time.toISOString(), end_time: slot.end_time.toISOString(), status: newStatus, price: parseFloat(slot.price)
      }]).select('id').single();
      
      updatedSlots[index].db_id = data.id;
      setSlots(updatedSlots);
    }
  };
  
  const updatePrice = async (index, newPrice) => {
      const updatedSlots = [...slots];
      updatedSlots[index].price = newPrice;
      setSlots(updatedSlots);
      
      if(updatedSlots[index].db_id) {
          await supabase.from('field_availabilities').update({ price: parseFloat(newPrice) }).eq('id', updatedSlots[index].db_id);
      }
  };

  // Safely format for the display label (e.g. "Friday, May 8, 2026")
  const getNiceDateLabel = () => {
    const [y, m, d] = currentDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <View>
            <Text style={styles.header}>{fieldName} Calendar</Text>
            <TouchableOpacity onPress={() => router.back()}>
                <Text style={{color: '#007bff', fontWeight: 'bold', marginTop: 5}}>← Back to All Fields</Text>
            </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/')}>
            <Text style={{color:'#fff'}}>Logout</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing}>
        <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>
          {syncing ? '🔄 Syncing with external calendar...' : '🔄 Pull Google Calendar Updates Now'}
        </Text>
      </TouchableOpacity>

      <View style={styles.toolsCard}>
        <Text style={styles.toolHeader}>📅 Jump to Date</Text>
        {Platform.OS === 'web' && (
           createElement('input', { 
               type: 'date', 
               value: currentDateStr, 
               onChange: (e) => setCurrentDateStr(e.target.value), 
               style: styles.webDate 
           })
        )}
      </View>

      <View style={[styles.toolsCard, { backgroundColor: '#e3f2fd' }]}>
        <Text style={styles.toolHeader}>⚡ Bulk Status Updater</Text>
        <Text style={{color: '#555', marginBottom: 10}}>Apply a status to ALL 36 time slots across multiple days.</Text>
        
        {Platform.OS === 'web' && (
          <View style={styles.bulkRow}>
            <View style={{flex: 1, marginRight: 10}}>
              <Text style={{fontWeight: 'bold'}}>From:</Text>
              {createElement('input', { type: 'date', value: bulkStartStr, onChange: (e) => setBulkStartStr(e.target.value), style: styles.webDate })}
            </View>
            <View style={{flex: 1, marginRight: 10}}>
              <Text style={{fontWeight: 'bold'}}>To:</Text>
              {createElement('input', { type: 'date', value: bulkEndStr, onChange: (e) => setBulkEndStr(e.target.value), style: styles.webDate })}
            </View>
            <View style={{flex: 1, marginRight: 10}}>
              <Text style={{fontWeight: 'bold'}}>Status:</Text>
              <Picker style={styles.bulkPicker} selectedValue={bulkStatus} onValueChange={setBulkStatus}>
                <Picker.Item label="Available" value="available" />
                <Picker.Item label="Booked (Unavailable)" value="booked" />
              </Picker>
            </View>
            {bulkLoading ? <ActivityIndicator size="small" color="#007bff" /> : (
              <TouchableOpacity style={styles.bulkBtn} onPress={applyBulkUpdate}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>Apply To All</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* --- PROMINENT DATE LABEL SECTION --- */}
      <View style={{backgroundColor: '#343a40', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 3}}>
          <Text style={{color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center'}}>
              📅 {getNiceDateLabel()}
          </Text>
      </View>

      <View style={styles.legendRow}>
        <Text style={{color: 'green', fontWeight: 'bold'}}>🟩 Available</Text>
        <Text style={{color: 'gray', fontWeight: 'bold'}}>⬜ Unavailable</Text>
        <Text style={{color: 'red', fontWeight: 'bold'}}>🟥 Booked (Sold)</Text>
      </View>

      {loading ? <ActivityIndicator size="large" style={{marginTop: 30}} /> : (
        <View style={{paddingBottom: 50}}>
          {slots.map((item, index) => {
            const timeStr = item.start_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
            let cardColor = '#e9ecef'; 
            if (item.status === 'available') cardColor = '#d4edda'; 
            if (item.status === 'booked') cardColor = '#f8d7da'; 

            return (
              <View key={index} style={[styles.slotRow, { backgroundColor: cardColor }]}>
                <Text style={styles.timeTxt}>{timeStr}</Text>
                
                <View style={{flex: 1, alignItems: 'center'}}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => toggleSlotStatus(index)}>
                        <Text style={{fontWeight: 'bold', color: '#333'}}>{item.status.toUpperCase()}</Text>
                    </TouchableOpacity>
                    
                    {item.status === 'booked' && (
                        <Text style={{fontSize: 10, color: '#dc3545', marginTop: 4, fontWeight: 'bold', textAlign: 'center'}}>
                            Locked / Booked
                        </Text>
                    )}
                </View>

                <View style={styles.priceBox}>
                  <Text>$</Text>
                  <TextInput 
                    style={styles.priceInput} 
                    value={item.price} 
                    keyboardType="numeric"
                    onChangeText={(txt) => updatePrice(index, txt)}
                    editable={item.status !== 'booked'} 
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f4f6f9' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#343a40' },
  logoutBtn: { backgroundColor: '#dc3545', padding: 8, borderRadius: 5 },
  syncBtn: { backgroundColor: '#17a2b8', padding: 15, borderRadius: 8, marginBottom: 20, alignItems: 'center', elevation: 2 },
  toolsCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#dee2e6' },
  toolHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#007bff' },
  webDate: { padding: 10, borderRadius: 5, border: '1px solid #ccc', width: '100%' },
  bulkRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' },
  bulkPicker: { height: 40, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, backgroundColor: '#fff', paddingHorizontal: 10 },
  bulkBtn: { backgroundColor: '#007bff', padding: 12, borderRadius: 5, justifyContent: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15, padding: 10, backgroundColor: '#fff', borderRadius: 8 },
  slotRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#ccc' },
  timeTxt: { flex: 1, fontSize: 18, fontWeight: 'bold' },
  actionBtn: { width: '100%', padding: 10, borderWidth: 1, borderColor: '#333', borderRadius: 5, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)' },
  priceBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  priceInput: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff', padding: 5, width: 60, marginLeft: 5, borderRadius: 5, textAlign: 'center' }
});
