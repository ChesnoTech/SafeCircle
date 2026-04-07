import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { reportFound, uploadPhoto } from '../../lib/api';
import { useLocationStore } from '../../lib/store';
import { CONFIG } from '../../lib/config';

export default function FoundReportScreen() {
  const router = useRouter();
  const { latitude, longitude } = useLocationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [form, setForm] = useState({
    category: '',
    color: '',
    brand: '',
    description: '',
    found_address: '',
    willing_to_hold: true,
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: CONFIG.ALLOWED_IMAGE_TYPES,
      quality: CONFIG.MAX_PHOTO_QUALITY,
    });
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
        Alert.alert(
          'Potential Match!',
          `${result.matches_found} lost item(s) match your description. The owner(s) will be notified.`,
        );
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
            <Text style={styles.photoText}>Add Photo (helps matching)</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Category *</Text>
      <View style={styles.chipGrid}>
        {CONFIG.ITEM_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, form.category === cat.id && styles.chipActiveSuccess]}
            onPress={() => setForm({ ...form, category: cat.id })}
          >
            <Text style={styles.chipIcon}>{cat.icon}</Text>
            <Text style={[styles.chipText, form.category === cat.id && styles.chipTextActive]}>
              {cat.id}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Color</Text>
      <View style={styles.colorRow}>
        {CONFIG.ITEM_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorChip,
              { backgroundColor: COLOR_MAP[color] || '#ccc' },
              form.color === color && styles.colorChipSelected,
            ]}
            onPress={() => setForm({ ...form, color: form.color === color ? '' : color })}
          />
        ))}
      </View>

      <Text style={styles.label}>Brand (optional)</Text>
      <View style={styles.chipGrid}>
        {CONFIG.ITEM_BRANDS.slice(0, 8).map((brand) => (
          <TouchableOpacity
            key={brand}
            style={[styles.chip, form.brand === brand && styles.chipActiveSuccess]}
            onPress={() => setForm({ ...form, brand: form.brand === brand ? '' : brand })}
          >
            <Text style={[styles.chipText, form.brand === brand && styles.chipTextActive]}>
              {brand.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Describe the item (keep some details private for verification)"
        value={form.description}
        onChangeText={(v) => setForm({ ...form, description: v })}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Where did you find it?</Text>
      <TextInput
        style={styles.input}
        placeholder="Address, landmark, or station"
        value={form.found_address}
        onChangeText={(v) => setForm({ ...form, found_address: v })}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Willing to hold the item?</Text>
        <Switch
          value={form.willing_to_hold}
          onValueChange={(v) => setForm({ ...form, willing_to_hold: v })}
          trackColor={{ true: CONFIG.COLORS.success }}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Report Found Item</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const COLOR_MAP = {
  black: '#000', white: '#fff', brown: '#8B4513', red: '#DC2626',
  blue: '#2563EB', green: '#22C55E', yellow: '#EAB308', orange: '#F97316',
  pink: '#EC4899', purple: '#9333EA', gray: '#9CA3AF', gold: '#D4A017', silver: '#C0C0C0',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CONFIG.COLORS.background, padding: 16 },
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
    backgroundColor: CONFIG.COLORS.card, borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: CONFIG.COLORS.border,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: CONFIG.COLORS.card, borderWidth: 1, borderColor: CONFIG.COLORS.border,
  },
  chipIcon: { fontSize: 16 },
  chipActiveSuccess: { backgroundColor: CONFIG.COLORS.success, borderColor: CONFIG.COLORS.success },
  chipText: { fontSize: 13, color: '#333', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorChip: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: CONFIG.COLORS.border,
  },
  colorChipSelected: { borderColor: CONFIG.COLORS.success, borderWidth: 3 },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16, backgroundColor: CONFIG.COLORS.card, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: CONFIG.COLORS.border,
  },
  switchLabel: { fontSize: 16, color: '#333' },
  error: { color: CONFIG.COLORS.error, textAlign: 'center', marginTop: 12 },
  submitButton: {
    backgroundColor: CONFIG.COLORS.success, padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 20,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
