import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { reportLost, uploadPhoto } from '../../lib/api';
import { useLocationStore } from '../../lib/store';
import { CONFIG } from '../../lib/config';
import { t } from '../../lib/i18n';

export default function LostReportScreen() {
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
    lost_address: '',
    reward: '',
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: CONFIG.ALLOWED_IMAGE_TYPES,
      quality: CONFIG.MAX_PHOTO_QUALITY,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!form.category) return setError(t('lostFound.selectCategory'));
    if (!form.description.trim()) return setError(t('lostFound.descriptionRequired'));
    setError('');
    setLoading(true);
    try {
      let photo_url;
      if (photo) {
        const uploaded = await uploadPhoto(photo);
        photo_url = uploaded.url;
      }
      await reportLost({
        ...form,
        photo_url,
        reward: form.reward ? parseInt(form.reward) : 0,
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
      <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoIcon}>+</Text>
            <Text style={styles.photoText}>{t('lostFound.addPhotoOptional')}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>{t('lostFound.category')}</Text>
      <View style={styles.chipGrid}>
        {CONFIG.ITEM_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, form.category === cat.id && styles.chipActiveWarning]}
            onPress={() => setForm({ ...form, category: cat.id })}
          >
            <Text style={styles.chipIcon}>{cat.icon}</Text>
            <Text style={[styles.chipText, form.category === cat.id && styles.chipTextActive]}>
              {cat.id}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('lostFound.color')}</Text>
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

      <Text style={styles.label}>{t('lostFound.brand')}</Text>
      <View style={styles.chipGrid}>
        {CONFIG.ITEM_BRANDS.slice(0, 8).map((brand) => (
          <TouchableOpacity
            key={brand}
            style={[styles.chip, form.brand === brand && styles.chipActiveWarning]}
            onPress={() => setForm({ ...form, brand: form.brand === brand ? '' : brand })}
          >
            <Text style={[styles.chipText, form.brand === brand && styles.chipTextActive]}>
              {brand.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('lostFound.description')}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={t('lostFound.describeItemDetail')}
        value={form.description}
        onChangeText={(v) => setForm({ ...form, description: v })}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>{t('lostFound.whereDidYouLose')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('lostFound.addressLandmark')}
        value={form.lost_address}
        onChangeText={(v) => setForm({ ...form, lost_address: v })}
      />

      <Text style={styles.label}>{t('lostFound.reward')}</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        value={form.reward}
        onChangeText={(v) => setForm({ ...form, reward: v })}
        keyboardType="numeric"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{t('lostFound.reportLostItem')}</Text>
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
  chipActiveWarning: { backgroundColor: CONFIG.COLORS.warning, borderColor: CONFIG.COLORS.warning },
  chipText: { fontSize: 13, color: '#333', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorChip: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: CONFIG.COLORS.border,
  },
  colorChipSelected: { borderColor: CONFIG.COLORS.warning, borderWidth: 3 },
  error: { color: CONFIG.COLORS.error, textAlign: 'center', marginTop: 12 },
  submitButton: {
    backgroundColor: CONFIG.COLORS.warning, padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 20,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
