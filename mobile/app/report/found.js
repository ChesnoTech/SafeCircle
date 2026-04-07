import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { reportFound, uploadPhoto } from '../../lib/api';
import { useLocationStore } from '../../lib/store';

const categories = ['wallet', 'phone', 'keys', 'bag', 'documents', 'jewelry', 'electronics', 'other'];

export default function FoundReportScreen() {
  const router = useRouter();
  const { latitude, longitude } = useLocationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [form, setForm] = useState({
    category: '',
    description: '',
    found_address: '',
    willing_to_hold: true,
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!form.category) return setError('Select a category');
    if (!form.description.trim()) return setError('Description is required');
    setError('');
    setLoading(true);
    try {
      let photo_url;
      if (photo) {
        const uploaded = await uploadPhoto(photo);
        photo_url = uploaded.url;
      }
      const result = await reportFound({
        ...form,
        photo_url,
        latitude,
        longitude,
        found_time: new Date().toISOString(),
      });
      if (result.matches_found > 0) {
        alert(`Potential match found! ${result.matches_found} lost item(s) match your description.`);
      }
      router.back();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
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
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Describe the item in detail"
        value={form.description}
        onChangeText={(v) => setForm({ ...form, description: v })}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Where did you find it?</Text>
      <TextInput
        style={styles.input}
        placeholder="Address, landmark, or metro station"
        value={form.found_address}
        onChangeText={(v) => setForm({ ...form, found_address: v })}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Willing to hold the item?</Text>
        <Switch
          value={form.willing_to_hold}
          onValueChange={(v) => setForm({ ...form, willing_to_hold: v })}
          trackColor={{ true: '#22C55E' }}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitText}>
          {loading ? 'Submitting...' : 'Report Found Item'}
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
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0',
  },
  categoryActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  categoryText: { fontSize: 14, color: '#333' },
  categoryTextActive: { color: '#fff', fontWeight: 'bold' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16, backgroundColor: '#fff', padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  switchLabel: { fontSize: 16, color: '#333' },
  error: { color: '#DC2626', textAlign: 'center', marginTop: 12 },
  submitButton: {
    backgroundColor: '#22C55E', padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 20,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
