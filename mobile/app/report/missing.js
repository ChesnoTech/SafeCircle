import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { createMissingReport, uploadPhoto, addReportPhotos, api } from '../../lib/api';
import { useLocationStore } from '../../lib/store';
import { CONFIG } from '../../lib/config';
import { t } from '../../lib/i18n';

const GENDERS = ['male', 'female', 'other', 'unknown'];

export default function MissingReportScreen() {
  const router = useRouter();
  const { latitude, longitude } = useLocationStore();
  const [phase, setPhase] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [reportId, setReportId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'unknown',
    clothing_description: '',
    last_seen_address: '',
    circumstances: '',
    alert_radius_km: '5',
  });
  const startTime = useRef(Date.now());

  const canAddMore = photos.length < CONFIG.MAX_PHOTOS;

  const pickImage = async () => {
    if (!canAddMore) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: CONFIG.ALLOWED_IMAGE_TYPES,
      quality: CONFIG.MAX_PHOTO_QUALITY,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    if (!canAddMore) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError(t('missing.cameraPermission'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: CONFIG.MAX_PHOTO_QUALITY,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhase1Submit = async () => {
    if (photos.length === 0) return setError(t('missing.photoRequired'));
    if (!form.name.trim()) return setError(t('missing.nameRequired'));
    setError('');
    setLoading(true);
    try {
      // Upload all photos
      const uploadedUrls = [];
      for (const uri of photos) {
        const uploaded = await uploadPhoto(uri);
        uploadedUrls.push(uploaded.url);
      }

      // Create report with the first photo
      const report = await createMissingReport({
        name: form.name.trim(),
        age: form.age ? parseInt(form.age) : undefined,
        alert_radius_km: parseInt(form.alert_radius_km) || 5,
        latitude,
        longitude,
        photo_url: uploadedUrls[0],
      });

      // Add additional photos if any
      if (uploadedUrls.length > 1) {
        await addReportPhotos(report.id, uploadedUrls.slice(1));
      }

      const elapsed = ((Date.now() - startTime.current) / 1000).toFixed(1);
      setReportId(report.id);
      setPhase(2);
      Alert.alert(
        t('missing.alertSentTitle'),
        t('missing.alertSentMessage', { seconds: elapsed }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhase2Submit = async () => {
    setError('');
    setLoading(true);
    try {
      await api(`/reports/missing/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          gender: form.gender,
          clothing_description: form.clothing_description || undefined,
          last_seen_address: form.last_seen_address || undefined,
          circumstances: form.circumstances || undefined,
        }),
      });
      router.back();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (phase === 1) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.urgentBanner}>
          <Text style={styles.urgentText}>{t('missing.quickAlertBanner')}</Text>
        </View>

        {/* Photo strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
          {photos.map((uri, index) => (
            <View key={index} style={styles.photoThumbWrap}>
              <Image source={{ uri }} style={styles.photoThumb} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(index)}>
                <Text style={styles.removeBtnText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}

          {canAddMore && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={takePhoto}>
              <Text style={styles.addPhotoIcon}>+</Text>
              <Text style={styles.addPhotoText}>{t('missing.takePhoto')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.photoActions}>
          {canAddMore && (
            <TouchableOpacity onPress={pickImage}>
              <Text style={styles.galleryLinkText}>
                {photos.length === 0 ? t('missing.chooseFromGallery') : t('photos.addMore')}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.photoCount}>
            {t('photos.photoCount', { count: photos.length, max: CONFIG.MAX_PHOTOS })}
          </Text>
        </View>

        <Text style={styles.label}>{t('missing.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('missing.namePlaceholder')}
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
          autoFocus
        />

        <Text style={styles.label}>{t('missing.ageLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('missing.agePlaceholder')}
          value={form.age}
          onChangeText={(v) => setForm({ ...form, age: v })}
          keyboardType="numeric"
        />

        <Text style={styles.label}>{t('missing.alertRadius')}</Text>
        <TextInput
          style={styles.input}
          value={form.alert_radius_km}
          onChangeText={(v) => setForm({ ...form, alert_radius_km: v })}
          keyboardType="numeric"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitDisabled]}
          onPress={handlePhase1Submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t('missing.sendAlertNow')}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  // Phase 2: Additional details
  return (
    <ScrollView style={styles.container}>
      <View style={styles.sentBanner}>
        <Text style={styles.sentIcon}>{'✓'}</Text>
        <Text style={styles.sentText}>{t('missing.alertLive')}</Text>
      </View>

      <Text style={styles.label}>{t('missing.gender')}</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.genderButton, form.gender === g && styles.genderActive]}
            onPress={() => setForm({ ...form, gender: g })}
          >
            <Text style={[styles.genderText, form.gender === g && styles.genderTextActive]}>
              {t(`missing.${g}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('missing.clothingDescription')}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={t('missing.whatWearing')}
        value={form.clothing_description}
        onChangeText={(v) => setForm({ ...form, clothing_description: v })}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>{t('missing.lastSeenLocation')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('missing.addressOrLandmark')}
        value={form.last_seen_address}
        onChangeText={(v) => setForm({ ...form, last_seen_address: v })}
      />

      <Text style={styles.label}>{t('missing.circumstances')}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={t('missing.anyDetails')}
        value={form.circumstances}
        onChangeText={(v) => setForm({ ...form, circumstances: v })}
        multiline
        numberOfLines={3}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.phase2Buttons}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.back()}
        >
          <Text style={styles.skipText}>{t('missing.skipForNow')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.updateButton, loading && styles.submitDisabled]}
          onPress={handlePhase2Submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t('missing.updateReport')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CONFIG.COLORS.background, padding: 16 },
  urgentBanner: {
    backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: CONFIG.COLORS.primary, marginBottom: 16,
  },
  urgentText: { color: CONFIG.COLORS.primary, textAlign: 'center', fontWeight: '600', fontSize: 14 },
  sentBanner: {
    backgroundColor: '#DCFCE7', padding: 16, borderRadius: 10,
    borderWidth: 1, borderColor: CONFIG.COLORS.success, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  sentIcon: { fontSize: 20, color: CONFIG.COLORS.success },
  sentText: { color: '#166534', fontWeight: '600', fontSize: 14 },
  // Multi-photo strip
  photoStrip: { marginBottom: 8 },
  photoThumbWrap: { position: 'relative', marginRight: 10 },
  photoThumb: { width: 120, height: 120, borderRadius: 12 },
  removeBtn: {
    position: 'absolute', top: -6, right: -6, width: 24, height: 24,
    borderRadius: 12, backgroundColor: CONFIG.COLORS.error,
    justifyContent: 'center', alignItems: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  addPhotoBtn: {
    width: 120, height: 120, borderRadius: 12, backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
    borderColor: CONFIG.COLORS.primary, borderStyle: 'dashed',
  },
  addPhotoIcon: { fontSize: 32, color: CONFIG.COLORS.primary },
  addPhotoText: { color: CONFIG.COLORS.primary, marginTop: 4, fontWeight: '600', fontSize: 12 },
  photoActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  photoCount: { fontSize: 13, color: CONFIG.COLORS.textSecondary },
  galleryLinkText: { color: CONFIG.COLORS.info, fontSize: 14 },
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
  phase2Buttons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  skipButton: {
    flex: 1, padding: 16, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: CONFIG.COLORS.border,
  },
  skipText: { color: CONFIG.COLORS.textSecondary, fontSize: 16 },
  updateButton: {
    flex: 2, backgroundColor: CONFIG.COLORS.primary, padding: 16,
    borderRadius: 12, alignItems: 'center',
  },
});
