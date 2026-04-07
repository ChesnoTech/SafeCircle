import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { createMissingReport, uploadPhoto } from '../../lib/api';
import { useLocationStore } from '../../lib/store';
import { CONFIG } from '../../lib/config';

export default function MissingReportScreen() {
  const router = useRouter();
  const { latitude, longitude } = useLocationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'unknown',
    clothing_description: '',
    last_seen_address: '',
    circumstances: '',
    alert_radius_km: '5',
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('Name is required');
    if (!photo) return setError('Photo is required');
    setError('');
    setLoading(true);
    try {
      const uploaded = await uploadPhoto(photo);
      await createMissingReport({
        ...form,
        age: form.age ? parseInt(form.age) : undefined,
        alert_radius_km: parseInt(form.alert_radius_km) || 5,
        latitude,
        longitude,
        photo_url: uploaded.url,
      });
      router.back();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const genders = ['male', 'female', 'other', 'unknown'];

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoIcon}>+</Text>
            <Text style={styles.photoText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="Full name of missing person"
        value={form.name}
        onChangeText={(v) => setForm({ ...form, name: v })}
      />

      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        placeholder="Approximate age"
        value={form.age}
        onChangeText={(v) => setForm({ ...form, age: v })}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {genders.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.genderButton, form.gender === g && styles.genderActive]}
            onPress={() => setForm({ ...form, gender: g })}
          >
            <Text style={[styles.genderText, form.gender === g && styles.genderTextActive]}>
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Clothing Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="What were they wearing?"
        value={form.clothing_description}
        onChangeText={(v) => setForm({ ...form, clothing_description: v })}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Last Seen Location</Text>
      <TextInput
        style={styles.input}
        placeholder="Address or landmark"
        value={form.last_seen_address}
        onChangeText={(v) => setForm({ ...form, last_seen_address: v })}
      />

      <Text style={styles.label}>Circumstances</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Any additional details"
        value={form.circumstances}
        onChangeText={(v) => setForm({ ...form, circumstances: v })}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Alert Radius (km)</Text>
      <TextInput
        style={styles.input}
        value={form.alert_radius_km}
        onChangeText={(v) => setForm({ ...form, alert_radius_km: v })}
        keyboardType="numeric"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitText}>
          {loading ? 'Submitting...' : 'Send Alert'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CONFIG.COLORS.background, padding: 16 },
  photoPicker: { alignItems: 'center', marginBottom: 20 },
  photoPreview: { width: 160, height: 160, borderRadius: 12 },
  photoPlaceholder: {
    width: 160, height: 160, borderRadius: 12, backgroundColor: '#e5e5e5',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
    borderColor: '#ccc', borderStyle: 'dashed',
  },
  photoIcon: { fontSize: 36, color: '#999' },
  photoText: { color: '#999', marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: CONFIG.COLORS.card, borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: CONFIG.COLORS.border,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderButton: {
    flex: 1, padding: 10, borderRadius: 8, backgroundColor: CONFIG.COLORS.card,
    borderWidth: 1, borderColor: CONFIG.COLORS.border, alignItems: 'center',
  },
  genderActive: { backgroundColor: CONFIG.COLORS.primary, borderColor: CONFIG.COLORS.primary },
  genderText: { fontSize: 14, color: '#333' },
  genderTextActive: { color: '#fff', fontWeight: 'bold' },
  error: { color: CONFIG.COLORS.error, textAlign: 'center', marginTop: 12 },
  submitButton: {
    backgroundColor: CONFIG.COLORS.primary, padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 20,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
