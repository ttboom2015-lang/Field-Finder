import React, { useState } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FreeAddressPicker({ placeholder, onAddressSelected, initialValue = '' }) {
  const [query, setQuery] = useState(initialValue);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // 1. Fetch autocomplete suggestions from the FREE OpenStreetMap / Geocode.co API
  const searchAddress = async (text) => {
    setQuery(text);
    if (text.length < 4) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setShowDropdown(true);

    try {
      // We search specifically in Canada to make results accurate
      const url = `https://geocode.maps.co/search?q=${encodeURIComponent(text + ', Canada')}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setPredictions(data.slice(0, 5)); // Limit to top 5 results
      } else {
        setPredictions([]);
      }
    } catch (err) {
      console.error("Free Geocoding API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. When a user taps a suggestion, extract the Postal Code
  const handleSelect = (item) => {
    const fullAddress = item.display_name;
    setQuery(fullAddress);
    setShowDropdown(false);
    setPredictions([]);

    // Extract Postal Code from the address string (Canadian format: A1A 1B1 or A1A)
    // We look for the classic Letter-Number-Letter pattern (e.g. H2X 1Y2 or H2X)
    const postalRegEx = /[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d|[A-Za-z]\d[A-Za-z]/;
    const match = fullAddress.match(postalRegEx);
    let postalCode = '';

    if (match) {
        // Take the first 3 characters (e.g. "H2X") to match your database format
        postalCode = match[0].substring(0, 3).toUpperCase();
    } else {
        // If the API didn't return a postal code, we try to guess it by prompting the user or falling back
        console.log("No postal code detected in address string:", fullAddress);
    }

    // Send the data back to the parent page (e.g., admin-setup or edit-team)
    onAddressSelected({
        fullAddress: fullAddress,
        postalCode: postalCode
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Ionicons name="location-outline" size={20} color="#666" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder || "Type address (e.g. 1250 Rene-Levesque, Montreal)"}
          value={query}
          onChangeText={searchAddress}
          onFocus={() => { if (predictions.length > 0) setShowDropdown(true); }}
        />
        {loading && <ActivityIndicator size="small" color="#1A73E8" style={styles.spinner} />}
      </View>

      {/* DROPDOWN MENU */}
      {showDropdown && predictions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={predictions}
            keyExtractor={(item, index) => index.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.predictionItem} 
                onPress={() => handleSelect(item)}
              >
                <Ionicons name="pin" size={16} color="#888" style={{marginRight: 10}} />
                <Text style={styles.predictionText} numberOfLines={2}>{item.display_name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', zIndex: 1000 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F3F4', borderRadius: 10, height: 50, borderWidth: 1, borderColor: '#ccc' },
  icon: { marginLeft: 15, marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333', height: '100%', outlineWidth: 0 }, 
  spinner: { marginRight: 15 },
  dropdown: { position: 'absolute', top: 55, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 8, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, maxHeight: 250, zIndex: 9999 },
  predictionItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  predictionText: { flex: 1, fontSize: 13, color: '#333' }
});
