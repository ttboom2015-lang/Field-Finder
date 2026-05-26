import React, { useState, useEffect, createElement } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');

const getLocalYYYYMMDD = (date) => {
    const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export default function AdminReports() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  
  const [startDateStr, setStartDateStr] = useState(getLocalYYYYMMDD(new Date(new Date().setDate(1)))); // First of month
  const [endDateStr, setEndDateStr] = useState(getLocalYYYYMMDD(new Date())); // Today

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: facility } = await supabase.from('facilities').select('id').eq('admin_id', user.id).single();
      if (!facility) return;

      const sISO = new Date(`${startDateStr}T00:00:00`).toISOString();
      const eISO = new Date(`${endDateStr}T23:59:59`).toISOString();

      // Fetch all booked slots for this facility
      const { data, error } = await supabase
        .from('field_availabilities')
        .select('id, start_time, price, fields!inner(id, name, facility_id)')
        .eq('fields.facility_id', facility.id)
        .eq('status', 'booked')
        .gte('start_time', sISO)
        .lte('start_time', eISO)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setReportData(data || []);

    } catch (err) { alert("Error generating report."); console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { generateReport(); }, []);

  // Calculate Totals
  const totalRevenue = reportData.reduce((sum, slot) => sum + (Number(slot.price) || 0), 0);
  const totalHours = (reportData.length * 30) / 60; // Each slot is 30 mins

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/admin-fields')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Financial Report</Text>
        <View style={{width: 40}} /> 
      </View>

      <ScrollView style={{padding: 20}}>
          <View style={styles.card}>
              <Text style={{fontWeight: 'bold', marginBottom: 10}}>Report Date Range</Text>
              <View style={{flexDirection: 'row', gap: 15}}>
                  <View style={{flex: 1}}>
                      {Platform.OS === 'web' && createElement('input', { type: 'date', value: startDateStr, onChange: (e) => setStartDateStr(e.target.value), style: styles.webDate })}
                  </View>
                  <View style={{flex: 1}}>
                      {Platform.OS === 'web' && createElement('input', { type: 'date', value: endDateStr, onChange: (e) => setEndDateStr(e.target.value), style: styles.webDate })}
                  </View>
              </View>
              <TouchableOpacity style={styles.btn} onPress={generateReport}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>Generate Report</Text>
              </TouchableOpacity>
          </View>

          {loading ? <ActivityIndicator size="large" color="#1A73E8" style={{marginTop: 50}}/> : (
              <>
                  {/* SUMMARY METRICS */}
                  <View style={{flexDirection: 'row', gap: 15, marginBottom: 20}}>
                      <View style={[styles.metricCard, {backgroundColor: '#E8F0FE'}]}>
                          <Text style={styles.metricLabel}>Total Revenue</Text>
                          <Text style={[styles.metricValue, {color: '#1A73E8'}]}>${totalRevenue.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.metricCard, {backgroundColor: '#F3E8FF'}]}>
                          <Text style={styles.metricLabel}>Total Hours Booked</Text>
                          <Text style={[styles.metricValue, {color: '#9333EA'}]}>{totalHours} hrs</Text>
                      </View>
                  </View>

                  <Text style={{fontWeight: 'bold', fontSize: 18, marginBottom: 15}}>Booking Details</Text>
                  
                  {reportData.length === 0 ? <Text style={{color: '#666'}}>No bookings found in this date range.</Text> : (
                      reportData.map(item => (
                          <View key={item.id} style={styles.rowItem}>
                              <View>
                                  <Text style={{fontWeight: 'bold'}}>{item.fields.name}</Text>
                                  <Text style={{color: '#666', fontSize: 12}}>
                                      {new Date(item.start_time).toLocaleString('en-CA', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                                  </Text>
                              </View>
                              <Text style={{fontWeight: 'bold', color: '#1A73E8'}}>${Number(item.price).toFixed(2)}</Text>
                          </View>
                      ))
                  )}
              </>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2, marginBottom: 20 },
  webDate: { padding: 10, borderRadius: 8, border: '1px solid #CCC', width: '100%', backgroundColor: '#F8F9FA' },
  btn: { backgroundColor: '#1A73E8', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  metricCard: { flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', elevation: 1 },
  metricLabel: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  metricValue: { fontSize: 24, fontWeight: '900' },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 }
});
