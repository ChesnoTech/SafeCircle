import { useState } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, Circle } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getHeatmapData } from '../../lib/api';
import { useLocationStore, useAlertStore } from '../../lib/store';
import { CONFIG } from '../../lib/config';
import { t } from '../../lib/i18n';

const MAP_DELTAS = { latitudeDelta: 0.05, longitudeDelta: 0.05 };

export default function MapScreen() {
  const router = useRouter();
  const { latitude, longitude } = useLocationStore();
  const { alerts } = useAlertStore();
  const [showHeatmap, setShowHeatmap] = useState(false);

  const { data: heatmapData } = useQuery({
    queryKey: ['heatmap'],
    queryFn: getHeatmapData,
    staleTime: 300000,
    enabled: showHeatmap,
  });

  const heatmapPoints = heatmapData?.points || [];

  if (!latitude || !longitude) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
        <Text style={styles.loadingText}>{t('map.gettingLocation')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ClusteredMapView
        style={styles.map}
        initialRegion={{ latitude, longitude, ...MAP_DELTAS }}
        showsUserLocation
        showsMyLocationButton
        clusterColor={CONFIG.COLORS.primary}
        clusterTextColor="#fff"
        clusterFontFamily="System"
        radius={40}
        minZoomLevel={0}
        maxZoom={16}
        animationEnabled={false}
      >
        {alerts.map((alert) => (
          <Marker
            key={alert.id}
            coordinate={{ latitude: alert.latitude, longitude: alert.longitude }}
            title={alert.name}
            description={alert.clothing_description || t('map.missingPerson')}
            pinColor={CONFIG.COLORS.primary}
            onCalloutPress={() => router.push(`/alert/${alert.id}`)}
          />
        ))}

        {alerts.map((alert) => (
          <Circle
            key={`circle-${alert.id}`}
            center={{ latitude: alert.latitude, longitude: alert.longitude }}
            radius={(alert.alert_radius_km || CONFIG.DEFAULT_RADIUS_KM) * 1000}
            fillColor="rgba(220, 38, 38, 0.1)"
            strokeColor="rgba(220, 38, 38, 0.3)"
            strokeWidth={1}
          />
        ))}

        {/* Heatmap overlay: semi-transparent circles at recent report locations */}
        {showHeatmap && heatmapPoints.map((point, i) => (
          <Circle
            key={`heat-${i}`}
            center={{ latitude: point.latitude, longitude: point.longitude }}
            radius={500}
            fillColor="rgba(239, 68, 68, 0.25)"
            strokeColor="rgba(239, 68, 68, 0.4)"
            strokeWidth={0}
          />
        ))}
      </ClusteredMapView>

      <View style={styles.legend}>
        <Text style={styles.legendText}>
          {t('map.activeAlerts', { count: alerts.length })}
        </Text>
        <View style={styles.legendActions}>
          <TouchableOpacity
            style={[styles.legendButton, showHeatmap && styles.legendButtonActive]}
            onPress={() => setShowHeatmap(!showHeatmap)}
          >
            <Text style={[styles.legendButtonText, showHeatmap && styles.legendButtonTextActive]}>
              {t('analytics.heatmap')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.legendButton}
            onPress={() => router.push('/trending')}
          >
            <Text style={styles.legendButtonText}>{t('analytics.trending')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: CONFIG.COLORS.textSecondary },
  map: { flex: 1 },
  legend: {
    position: 'absolute', bottom: 20, start: 20, end: 20,
    backgroundColor: CONFIG.COLORS.card, padding: 12, borderRadius: 12,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, alignItems: 'center',
  },
  legendText: { fontSize: 14, fontWeight: '600', color: CONFIG.COLORS.text },
  legendActions: { flexDirection: 'row', marginTop: 8, gap: 8 },
  legendButton: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  legendButtonActive: { backgroundColor: CONFIG.COLORS.primary },
  legendButtonText: { fontSize: 12, fontWeight: '600', color: CONFIG.COLORS.textSecondary },
  legendButtonTextActive: { color: '#fff' },
});
