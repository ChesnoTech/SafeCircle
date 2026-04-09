import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReport, getSightings, reportSighting, getReportPhotos, resolveReport } from '../../lib/api';
import { useLocationStore } from '../../lib/store';
import { watchReport, unwatchReport, getSocket } from '../../lib/socket';
import { shareAlert } from '../../lib/sharing';
import { CONFIG } from '../../lib/config';
import { t } from '../../lib/i18n';

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t('time.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return t('time.daysAgo', { count: Math.floor(hours / 24) });
}

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { latitude, longitude } = useLocationStore();
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [sightingNotes, setSightingNotes] = useState('');
  const [confidence, setConfidence] = useState('unsure');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveType, setResolveType] = useState('found_safe');
  const [resolveStory, setResolveStory] = useState('');
  const [resolveRating, setResolveRating] = useState(5);

  // Subscribe to real-time sighting updates for this report
  useEffect(() => {
    watchReport(id);
    const socket = getSocket();
    const handleNewSighting = (sighting) => {
      queryClient.invalidateQueries({ queryKey: ['sightings', id] });
    };
    socket.on('new_sighting', handleNewSighting);

    return () => {
      unwatchReport(id);
      socket.off('new_sighting', handleNewSighting);
    };
  }, [id]);

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', id],
    queryFn: () => getReport(id),
  });

  const { data: sightingsData } = useQuery({
    queryKey: ['sightings', id],
    queryFn: () => getSightings(id),
  });

  const { data: photosData } = useQuery({
    queryKey: ['report-photos', id],
    queryFn: () => getReportPhotos(id),
  });

  const sightingMutation = useMutation({
    mutationFn: (data) => reportSighting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sightings', id] });
      setShowSightingForm(false);
      setSightingNotes('');
    },
  });

  const handleReportSighting = () => {
    sightingMutation.mutate({
      report_id: id,
      latitude,
      longitude,
      confidence,
      notes: sightingNotes,
    });
  };

  const resolveMutation = useMutation({
    mutationFn: (data) => resolveReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      setShowResolveModal(false);
      Alert.alert(t('resolution.resolved'), t('resolution.resolvedMessage'));
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  });

  const handleResolve = () => {
    resolveMutation.mutate({
      resolution_type: resolveType,
      story: resolveStory || undefined,
      rating: resolveRating,
    });
  };

  if (isLoading || !report) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
      </View>
    );
  }

  if (report.error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: CONFIG.COLORS.error, fontSize: 16 }}>{t('alertDetail.notFound')}</Text>
      </View>
    );
  }

  const sightings = sightingsData?.sightings || [];
  const extraPhotos = photosData?.photos || [];
  const allPhotos = [{ photo_url: report.photo_url }, ...extraPhotos];

  return (
    <ScrollView style={styles.container}>
      {allPhotos.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGallery}>
          {allPhotos.map((p, i) => (
            <Image key={i} source={{ uri: p.photo_url }} style={styles.galleryPhoto} />
          ))}
        </ScrollView>
      )}

      <View style={styles.header}>
        <Image
          source={{ uri: report.photo_url }}
          style={styles.photo}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{report.name}</Text>
          {report.age && <Text style={styles.detail}>{t('alertDetail.age', { age: report.age })}</Text>}
          {report.gender !== 'unknown' && <Text style={styles.detail}>{t('alertDetail.gender', { gender: report.gender })}</Text>}
          <Text style={styles.time}>{getTimeAgo(report.created_at)}</Text>
          <View style={styles.headerActions}>
            <View style={[styles.statusBadge, report.status === 'active' ? styles.statusActive : styles.statusResolved]}>
              <Text style={styles.statusText}>{report.status}</Text>
            </View>
            <TouchableOpacity style={styles.shareButton} onPress={() => shareAlert(report)}>
              <Text style={styles.shareIcon}>{'\uD83D\uDCE4'}</Text>
              <Text style={styles.shareText}>{t('sharing.share')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {report.clothing_description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('alertDetail.clothing')}</Text>
          <Text style={styles.sectionBody}>{report.clothing_description}</Text>
        </View>
      )}

      {report.circumstances && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('alertDetail.circumstances')}</Text>
          <Text style={styles.sectionBody}>{report.circumstances}</Text>
        </View>
      )}

      {report.last_seen_address && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('alertDetail.lastSeen')}</Text>
          <Text style={styles.sectionBody}>{report.last_seen_address}</Text>
        </View>
      )}

      {report.latitude && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: report.latitude,
            longitude: report.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          <Marker
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            pinColor="#DC2626"
            title={t('alertDetail.lastSeen')}
          />
          <Circle
            center={{ latitude: report.latitude, longitude: report.longitude }}
            radius={(report.alert_radius_km || 5) * 1000}
            fillColor="rgba(220, 38, 38, 0.1)"
            strokeColor="rgba(220, 38, 38, 0.3)"
          />
          {sightings.map((s) => (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.latitude, longitude: s.longitude }}
              pinColor="#F59E0B"
              title={`Sighting - ${s.confidence}`}
              description={s.notes || ''}
            />
          ))}
        </MapView>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('alertDetail.sightingsCount', { count: sightings.length })}</Text>
        {sightings.length === 0 ? (
          <Text style={styles.emptyText}>{t('alertDetail.noSightings')}</Text>
        ) : (
          sightings.map((s) => (
            <View key={s.id} style={styles.sightingCard}>
              <Text style={styles.sightingConfidence}>{s.confidence}</Text>
              {s.notes && <Text style={styles.sightingNotes}>{s.notes}</Text>}
              <Text style={styles.sightingTime}>{getTimeAgo(s.created_at)}</Text>
            </View>
          ))
        )}
      </View>

      {report.status === 'active' && (
        <>
          {showSightingForm ? (
            <View style={styles.sightingForm}>
              <Text style={styles.formTitle}>{t('alertDetail.sightingFormTitle')}</Text>
              <Text style={styles.label}>{t('alertDetail.confidence')}</Text>
              <View style={styles.confidenceRow}>
                {['certain', 'likely', 'unsure'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.confButton, confidence === c && styles.confActive]}
                    onPress={() => setConfidence(c)}
                  >
                    <Text style={[styles.confText, confidence === c && styles.confTextActive]}>{t(`alertDetail.${c}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder={t('alertDetail.notesPlaceholder')}
                value={sightingNotes}
                onChangeText={setSightingNotes}
                multiline
              />
              <TouchableOpacity style={styles.submitButton} onPress={handleReportSighting}>
                <Text style={styles.submitText}>{t('alertDetail.submitSighting')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.sightingButton}
              onPress={() => setShowSightingForm(true)}
            >
              <Text style={styles.sightingButtonText}>{t('alertDetail.reportSighting')}</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Resolve button (only for active reports) */}
      {report.status === 'active' && (
        <TouchableOpacity
          style={styles.resolveButton}
          onPress={() => setShowResolveModal(true)}
        >
          <Text style={styles.resolveButtonText}>{t('resolution.markResolved')}</Text>
        </TouchableOpacity>
      )}

      {/* Stories link */}
      <TouchableOpacity style={styles.storiesLink} onPress={() => router.push('/stories')}>
        <Text style={styles.storiesLinkIcon}>{'\uD83C\uDF1F'}</Text>
        <Text style={styles.storiesLinkText}>{t('resolution.viewStories')}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Resolve Modal */}
      <Modal
        visible={showResolveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResolveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('resolution.resolveTitle')}</Text>

            <Text style={styles.modalLabel}>{t('resolution.resolutionType')}</Text>
            <View style={styles.resolveTypes}>
              {['found_safe', 'returned', 'resolved', 'closed'].map((rt) => (
                <TouchableOpacity
                  key={rt}
                  style={[styles.resolveTypeBtn, resolveType === rt && styles.resolveTypeBtnActive]}
                  onPress={() => setResolveType(rt)}
                >
                  <Text style={[styles.resolveTypeText, resolveType === rt && styles.resolveTypeTextActive]}>
                    {t(`resolution.${rt}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>{t('resolution.shareStory')}</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder={t('resolution.storyPlaceholder')}
              value={resolveStory}
              onChangeText={setResolveStory}
              multiline
            />

            <Text style={styles.modalLabel}>{t('resolution.rating')}</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setResolveRating(star)}>
                  <Text style={[styles.star, star <= resolveRating && styles.starActive]}>
                    {'\u2605'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.resolveSubmitBtn}
              onPress={handleResolve}
              disabled={resolveMutation.isPending}
            >
              {resolveMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resolveSubmitText}>{t('resolution.confirm')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowResolveModal(false)}
            >
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  photoGallery: { backgroundColor: '#000', paddingVertical: 8 },
  galleryPhoto: { width: 200, height: 200, borderRadius: 8, marginHorizontal: 4 },
  header: { flexDirection: 'row', backgroundColor: '#fff', padding: 16 },
  photo: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#eee' },
  headerInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  detail: { fontSize: 15, color: '#444', marginTop: 2 },
  time: { fontSize: 13, color: '#888', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: '#FEE2E2' },
  statusResolved: { backgroundColor: '#DCFCE7' },
  statusText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 12, backgroundColor: '#EEF2FF',
  },
  shareIcon: { fontSize: 14, marginRight: 4 },
  shareText: { fontSize: 12, fontWeight: '600', color: '#6366F1' },
  section: { backgroundColor: '#fff', padding: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  sectionBody: { fontSize: 15, color: '#555', lineHeight: 22 },
  map: { height: 250, marginTop: 8 },
  emptyText: { color: '#888', fontStyle: 'italic' },
  sightingCard: {
    backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, marginTop: 8,
    borderLeftWidth: 3, borderLeftColor: '#F59E0B',
  },
  sightingConfidence: { fontSize: 14, fontWeight: 'bold', color: '#333', textTransform: 'capitalize' },
  sightingNotes: { fontSize: 14, color: '#555', marginTop: 4 },
  sightingTime: { fontSize: 12, color: '#888', marginTop: 4 },
  sightingButton: {
    backgroundColor: '#F59E0B', padding: 16, borderRadius: 12,
    alignItems: 'center', margin: 16,
  },
  sightingButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sightingForm: { backgroundColor: '#fff', padding: 16, marginTop: 8 },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  confidenceRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  confButton: {
    flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#f5f5f5',
    alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0',
  },
  confActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  confText: { fontSize: 14, color: '#333', textTransform: 'capitalize' },
  confTextActive: { color: '#fff', fontWeight: 'bold' },
  input: {
    backgroundColor: '#f9f9f9', borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  submitButton: {
    backgroundColor: '#F59E0B', padding: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 12,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Resolve
  resolveButton: {
    backgroundColor: '#22C55E', padding: 16, borderRadius: 12,
    alignItems: 'center', margin: 16,
  },
  resolveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  storiesLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, marginHorizontal: 16,
  },
  storiesLinkIcon: { fontSize: 18, marginRight: 6 },
  storiesLinkText: { fontSize: 15, color: '#6366F1', fontWeight: '600' },
  // Resolve Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 12 },
  resolveTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resolveTypeBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0',
  },
  resolveTypeBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  resolveTypeText: { fontSize: 13, color: '#333' },
  resolveTypeTextActive: { color: '#fff', fontWeight: 'bold' },
  ratingRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  star: { fontSize: 28, color: '#ddd' },
  starActive: { color: '#F59E0B' },
  resolveSubmitBtn: {
    backgroundColor: '#22C55E', padding: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 20,
  },
  resolveSubmitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalCloseBtn: {
    padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  modalCloseText: { fontSize: 16, color: '#333' },
});
