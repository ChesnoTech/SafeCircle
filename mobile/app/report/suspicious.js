import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { submitIntelReport, uploadPhoto } from '../../lib/api';
import { useLocationStore } from '../../lib/store';

const categories = [
  'suspicious_vehicle', 'suspicious_person', 'attempted_luring',
  'unattended_child', 'unsafe_area', 'other',
];

const severities = ['low', 'medium', 'high', 'urgent'];

export default function SuspiciousReportScreen() {
  const router = useRouter();
  const { latitude, longitude } = useLocationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [form, setForm] = useState({
    category: '',
    description: '',
    address: '',
    severity: 'medium',
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!form.category) return setError('Select a category');
    if (form.description.length < 10) return setError('Description must be at least 10 characters');
    setError('');
    setLoading(true);
    try {
      let photo_url;
      if (photo) {
        const uploaded = await uploadPhoto(photo);
        photo_url = uploaded.url;
      }
      await submitIntelReport({
        ...form,
        photo_url,
        latitude,
        longitude,
      });
      router.back();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.anonBanner}>
        <Text style={styles.anonText}>This report is completely anonymous</Text>
      </View>

      <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoIcon}>+</Text>
            <Text style={styles.photoText}>Add Photo (optional)</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Category *</Text>
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryButton, form.category === cat && styles.categoryActive]}
            onPress={() => setForm({ ...form, category: cat })}
          >
            <Text style={[styles.categoryText, form.category === cat && styles.categoryTextActive]}>
              {cat.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description * (min 10 chars)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Describe what you observed"
        value={form.description}
        onChangeText={(v) => setForm({ ...form, description: v })}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Location</Text>
      <TextInput
        style={styles.input}
        placeholder="Address or landmark (optional)"
        value={form.address}
        onChangeText={(v) => setForm({ ...form, address: v })}
      />

      <Text style={styles.label}>Severity</Text>
      <View style={styles.severityRow}>
        {severities.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.severityButton, form.severity === s && styles[`severity_${s}`]]}
            onPress={() => setForm({ ...form, severity: s })}
          >
            <Text style={[styles.severityText, form.severity === s && styles.severityTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitText}>
          {loading ? 'Submitting...' : 'Submit Report'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  photoPicker: { alignItems: 'center', marginBottom: 12 },
  photoPreview: { width: 140, height: 140, borderRadius: 12 },
  photoPlaceholder: {
    width: 140, height: 140, borderRadius: 12, backgroundColor: '#e5e5e5',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
    borderColor: '#ccc', borderStyle: 'dashed',
  },
  photoIcon: { fontSize: 32, color: '#999' },
  photoText: { color: '#999', fontSize: 12, marginTop: 4 },
  anonBanner: {
    backgroundColor: '#EEF2FF', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#C7D2FE', marginBottom: 8,
  },
  anonText: { color: '#4338CA', textAlign: 'center', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0',
  },
  categoryActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  categoryText: { fontSize: 13, color: '#333', textTransform: 'capitalize' },
  categoryTextActive: { color: '#fff', fontWeight: 'bold' },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityButton: {
    flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center',
  },
  severity_low: { backgroundColor: '#DCFCE7', borderColor: '#22C55E' },
  severity_medium: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  severity_high: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  severity_urgent: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  severityText: { fontSize: 13, color: '#333', textTransform: 'capitalize' },
  severityTextActive: { fontWeight: 'bold' },
  error: { color: '#DC2626', textAlign: 'center', marginTop: 12 },
  submitButton: {
    backgroundColor: '#6366F1', padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 20,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
