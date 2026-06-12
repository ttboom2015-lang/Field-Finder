import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabaseClient';
//const supabase = createClient('https://lsquxrvufehselooyenj.supabase.co', 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb');

interface SportConfig {
  id?: number;
  sport_name: string;
  formats: string[];
}

const DEFAULT_PRESETS = ['1v1', '2v2', '3v3', '5v5', '7v7', '9v9', '11v11', 'Other'];

export default function SuperAdminConfig() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Super Admin Personal Profile States
  const [adminName, setAdminName] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [updatingProfile, setUpdatingProfile] = useState<boolean>(false);

  // Sports Configuration States
  const [sports, setSports] = useState<SportConfig[]>([]);
  const [loadingSports, setLoadingSports] = useState<boolean>(false);

  // Form States for Sports
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sportName, setSportName] = useState<string>('');
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [customFormat, setCustomFormat] = useState<string>('');

  // Age Groups States
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [newAgeGroup, setNewAgeGroup] = useState<string>('');
  const [loadingAgeGroups, setLoadingAgeGroups] = useState<boolean>(false);

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role === 'super_admin') {
          setAuthorized(true);
          setAdminName(profile.full_name || '');
          setAdminEmail(profile.email || '');
          loadSports();
          loadAgeGroups();
        } else {
          Alert.alert("Access Denied", "You do not have Super Admin privileges.");
          router.replace('/');
        }
      } catch (err) {
        router.replace('/');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkSuperAdminStatus();
  }, []);

  const loadSports = async () => {
    setLoadingSports(true);
    try {
      const { data, error } = await supabase
        .from('sports_config')
        .select('*')
        .order('sport_name', { ascending: true });

      if (error) throw error;
      setSports(data || []);
    } catch (err: any) {
      Alert.alert("Error loading config", err.message);
    } finally {
      setLoadingSports(false);
    }
  };

  const loadAgeGroups = async () => {
    setLoadingAgeGroups(true);
    try {
      const { data, error } = await supabase
        .from('age_groups_config')
        .select('name')
        .order('name', { ascending: true });

      if (error) throw error;
      setAgeGroups(data?.map(i => i.name) || []);
    } catch (err: any) {
      Alert.alert("Error loading age groups", err.message);
    } finally {
      setLoadingAgeGroups(false);
    }
  };

  const handleUpdateProfile = async () => {
    const trimmedName = adminName.trim();
    if (!trimmedName) {
      Alert.alert("Validation Error", "Full Name cannot be empty.");
      return;
    }

    setUpdatingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: trimmedName })
        .eq('id', user.id);

      if (error) throw error;
      Alert.alert("Success", "Super Admin profile updated successfully!");
    } catch (err: any) {
      Alert.alert("Update Error", err.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAddAgeGroup = async () => {
    const cleaned = newAgeGroup.trim();
    if (!cleaned) return;
    try {
      const { error } = await supabase.from('age_groups_config').insert([{ name: cleaned }]);
      if (error) throw error;
      setNewAgeGroup('');
      loadAgeGroups();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleDeleteAgeGroup = async (name: string) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete the category "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from('age_groups_config').delete().eq('name', name);
              if (error) throw error;
              loadAgeGroups();
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          }
        }
      ]
    );
  };

  const handleToggleFormat = (format: string) => {
    if (selectedFormats.includes(format)) {
      setSelectedFormats(selectedFormats.filter(f => f !== format));
    } else {
      setSelectedFormats([...selectedFormats, format]);
    }
  };

  const handleAddCustomFormat = () => {
    const cleaned = customFormat.trim();
    if (!cleaned) return;
    if (!selectedFormats.includes(cleaned)) {
      setSelectedFormats([...selectedFormats, cleaned]);
    }
    setCustomFormat('');
  };

  const handleSaveSport = async () => {
    const cleanedSportName = sportName.trim();
    if (!cleanedSportName) {
      Alert.alert("Validation Error", "Please enter a sport name.");
      return;
    }
    if (selectedFormats.length === 0) {
      Alert.alert("Validation Error", "Please select or add at least one format category.");
      return;
    }

    setLoadingSports(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('sports_config')
          .update({ sport_name: cleanedSportName, formats: selectedFormats })
          .eq('id', editingId);
        if (error) throw error;
        Alert.alert("Success", "Sport configuration updated.");
      } else {
        const { error } = await supabase
          .from('sports_config')
          .insert([{ sport_name: cleanedSportName, formats: selectedFormats }]);
        if (error) throw error;
        Alert.alert("Success", "New sport category added.");
      }

      resetForm();
      loadSports();
    } catch (err: any) {
      Alert.alert("Save Error", err.message);
      setLoadingSports(false);
    }
  };

  const handleDeleteSport = async (id: number, name: string) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to completely remove the sport "${name}"? Existing fields using this sport will lose their format filters.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoadingSports(true);
            try {
              const { error } = await supabase.from('sports_config').delete().eq('id', id);
              if (error) throw error;
              loadSports();
              resetForm();
            } catch (err: any) {
              Alert.alert("Delete Error", err.message);
              setLoadingSports(false);
            }
          }
        }
      ]
    );
  };

  const handleEditSport = (item: SportConfig) => {
    setEditingId(item.id || null);
    setSportName(item.sport_name);
    setSelectedFormats(item.formats);
  };

  const resetForm = () => {
    setEditingId(null);
    setSportName('');
    setSelectedFormats([]);
    setCustomFormat('');
  };

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A73E8" />
        <Text style={styles.loadingText}>Verifying credentials...</Text>
      </View>
    );
  }

  if (!authorized) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/search')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>System Configurations</Text>
        <TouchableOpacity onPress={resetForm} style={styles.addIcon}>
          <Ionicons name="refresh" size={24} color="#1A73E8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        {/* --- SECTION A: SUPER ADMIN PROFILE CARD --- */}
        <View style={[styles.card, { borderLeftWidth: 5, borderLeftColor: '#10B981' }]}>
          <Text style={[styles.sectionHeader, { color: '#10B981' }]}>👤 Super Admin Profile Information</Text>
          
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={adminName} onChangeText={setAdminName} placeholder="Edit your name" />

          <Text style={styles.label}>Email Address (Read-only)</Text>
          <TextInput style={[styles.input, { backgroundColor: '#E8E8E8', color: '#666' }]} value={adminEmail} editable={false} />

          <TouchableOpacity style={[styles.btn, { backgroundColor: '#10B981', marginTop: 15 }]} onPress={handleUpdateProfile} disabled={updatingProfile}>
            {updatingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>

        {/* --- SECTION B: DYNAMIC AGE GROUPS CONFIG --- */}
        <View style={[styles.card, { borderLeftWidth: 5, borderLeftColor: '#F59E0B' }]}>
          <Text style={[styles.sectionHeader, { color: '#F59E0B' }]}>👥 Manage Age Groups / Categories</Text>
          <Text style={{color: '#666', fontSize: 12, marginBottom: 10}}>Add or remove categories dynamically (e.g. U7, Adult, Business, Competitive):</Text>
          
          <View style={styles.customRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={newAgeGroup}
              onChangeText={setNewAgeGroup}
              placeholder="e.g. Adult, Business, U7"
            />
            <TouchableOpacity style={[styles.addCustomBtn, { backgroundColor: '#F59E0B' }]} onPress={handleAddAgeGroup}>
              <Text style={styles.addCustomBtnTxt}>Add Category</Text>
            </TouchableOpacity>
          </View>

          {loadingAgeGroups ? (
            <ActivityIndicator size="small" color="#F59E0B" style={{ marginTop: 15 }} />
          ) : (
            <View style={styles.presetContainer}>
              {ageGroups.map(name => (
                <View key={name} style={styles.activeFormatBadge}>
                  <Text style={styles.activeFormatText}>{name}</Text>
                  <TouchableOpacity onPress={() => handleDeleteAgeGroup(name)}>
                    <Ionicons name="close-circle" size={16} color="#dc3545" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* --- SECTION C: EDIT / CREATE SPORT FORM --- */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>
            {editingId ? "✏️ Edit Sport & Format Rules" : "✨ Add New Sport / Activity"}
          </Text>

          <Text style={styles.label}>Sport Name *</Text>
          <TextInput
            style={styles.input}
            value={sportName}
            onChangeText={setSportName}
            placeholder="e.g. Ping Pong, Volleyball, Pickleball"
          />

          <Text style={styles.label}>Select Standard Format Presets *</Text>
          <View style={styles.presetContainer}>
            {DEFAULT_PRESETS.map(preset => {
              const isSelected = selectedFormats.includes(preset);
              return (
                <TouchableOpacity
                  key={preset}
                  style={[styles.presetBadge, isSelected && styles.presetBadgeSelected]}
                  onPress={() => handleToggleFormat(preset)}
                >
                  <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>{preset}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Add Custom / Custom Team Category</Text>
          <View style={styles.customRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={customFormat}
              onChangeText={setCustomFormat}
              placeholder="e.g. 6v6, 4v4, Singles, Doubles"
            />
            <TouchableOpacity style={styles.addCustomBtn} onPress={handleAddCustomFormat}>
              <Text style={styles.addCustomBtnTxt}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* ACTIVE SELECTED SCHEMAS */}
          {selectedFormats.length > 0 && (
            <View style={styles.selectedFormatsBox}>
              <Text style={styles.labelSmall}>Formats allowed for {sportName || 'this sport'}:</Text>
              <View style={styles.badgeRow}>
                {selectedFormats.map(fmt => (
                  <View key={fmt} style={styles.activeFormatBadge}>
                    <Text style={styles.activeFormatText}>{fmt}</Text>
                    <TouchableOpacity onPress={() => handleToggleFormat(fmt)}>
                      <Ionicons name="close-circle" size={16} color="#dc3545" style={{ marginLeft: 5 }} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#1A73E8', flex: 1 }]} onPress={handleSaveSport}>
              <Text style={styles.btnText}>{editingId ? "Update System" : "Add to Platform"}</Text>
            </TouchableOpacity>
            {editingId && (
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#6c757d', marginLeft: 10 }]} onPress={resetForm}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* --- SECTION D: REGISTERED SYSTEM CONFIGURATIONS --- */}
        <Text style={styles.subHeader}>Registered Sports & Categories</Text>
        {loadingSports ? (
          <ActivityIndicator size="large" color="#1A73E8" style={{ marginTop: 20 }} />
        ) : sports.length === 0 ? (
          <Text style={styles.emptyText}>No custom configurations found in system.</Text>
        ) : (
          sports.map(item => (
            <View key={item.id} style={styles.sportCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sportCardTitle}>{item.sport_name}</Text>
                <Text style={styles.sportCardFormats}>
                  Allowed Categories: {item.formats.join(', ')}
                </Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleEditSport(item)} style={styles.iconBtn}>
                  <Ionicons name="create-outline" size={22} color="#1A73E8" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteSport(item.id!, item.sport_name)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={22} color="#dc3545" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  loadingText: { marginTop: 15, fontSize: 16, fontWeight: 'bold', color: '#666' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  addIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 3, marginBottom: 25 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#1A73E8', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 15 },
  subHeader: { fontSize: 18, fontWeight: 'bold', color: '#555', marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8, marginTop: 12 },
  labelSmall: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 6 },
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 10, fontSize: 15, color: '#333', marginBottom: 5 },
  presetContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  presetBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E8F0FE', borderWidth: 1, borderColor: '#D0E3FF' },
  presetBadgeSelected: { backgroundColor: '#1A73E8', borderColor: '#1A73E8' },
  presetText: { fontSize: 13, fontWeight: '600', color: '#1A73E8' },
  presetTextSelected: { color: '#fff' },
  customRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 5 },
  addCustomBtn: { backgroundColor: '#1A73E8', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  addCustomBtnTxt: { color: '#fff', fontWeight: 'bold' },
  selectedFormatsBox: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, marginTop: 15, borderWidth: 1, borderColor: '#EEE' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activeFormatBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#DDD' },
  activeFormatText: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  actionRow: { flexDirection: 'row', marginTop: 20 },
  btn: { padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 10, fontSize: 15 },
  sportCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 18, borderRadius: 12, marginBottom: 12, elevation: 1, borderLeftWidth: 5, borderLeftColor: '#1A73E8' },
  sportCardTitle: { fontSize: 17, fontWeight: 'bold', color: '#111' },
  sportCardFormats: { fontSize: 13, color: '#666', marginTop: 4, fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { padding: 5 }
});
