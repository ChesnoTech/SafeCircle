import { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { getNearbyAlerts } from '../../lib/api';
import { useLocationStore, useAlertStore } from '../../lib/store';
import { joinRegion } from '../../lib/socket';
import { CONFIG } from '../../lib/config';
import { t } from '../../lib/i18n';

function AlertCard({ alert, onPress }) {
  const distanceKm = alert.distance_m ? (alert.distance_m / 1000).toFixed(1) : '?';
  const timeAgo = getTimeAgo(alert.created_at);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image
        source={{ uri: alert.photo_url }}
        style={styles.photo}
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardName}>{alert.name}</Text>
        {alert.age && <Text style={styles.cardDetail}>{t('home.age', { age: alert.age })}</Text>}
        {alert.clothing_description && (
          <Text style={styles.cardDetail} numberOfLines={1}>
            {alert.clothing_description}
          </Text>
        )}
        <Text style={styles.cardMeta}>
          {t('home.kmAway', { distance: distanceKm })} · {timeAgo} · {t('home.sightings', { count: alert.sighting_count || 0 })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t('time.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return t('time.daysAgo', { count: Math.floor(hours / 24) });
}

export default function HomeScreen() {
  const router = useRouter();
  const { latitude, longitude, setLocation } = useLocationStore();
  const { alerts, setAlerts } = useAlertStore();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords.latitude, loc.coords.longitude);
      }
    })();
  }, []);

  // Join Socket.IO region when location changes
  useEffect(() => {
    if (latitude && longitude) {
      joinRegion(latitude, longitude);
    }
  }, [latitude, longitude]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['alerts', latitude, longitude],
    queryFn: () => getNearbyAlerts(latitude, longitude, CONFIG.DEFAULT_RADIUS_KM),
    enabled: !!latitude && !!longitude,
    refetchInterval: CONFIG.ALERT_REFRESH_INTERVAL_MS,
  });

  useEffect(() => {
    if (data?.alerts) setAlerts(data.alerts);
  }, [data]);

  if (!latitude) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
        <Text style={styles.loading}>{t('home.gettingLocation')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('home.activeAlerts')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('home.alertsCount', { count: alerts.length, radius: CONFIG.DEFAULT_RADIUS_KM })}
        </Text>
      </View>

      {isLoading && alerts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
          <Text style={styles.loading}>{t('home.loadingAlerts')}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.error}>
            {error.message === 'Network request failed'
              ? t('home.noInternet')
              : t('home.failedToLoad')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AlertCard
              alert={item}
              onPress={() => router.push(`/alert/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyText}>{t('home.noActiveAlerts')}</Text>
              <Text style={styles.emptySubtext}>{t('home.areaSafe')}</Text>
            </View>
          }
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={alerts.length === 0 && styles.emptyContainer}
        />
      )}
    </View>
  );
}

const { COLORS } = CONFIG;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { backgroundColor: COLORS.primary, padding: 16, paddingTop: 8 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#fecaca', fontSize: 14, marginTop: 4 },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.card, marginHorizontal: 12,
    marginTop: 12, borderRadius: 12, padding: 12, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3,
  },
  photo: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
  cardContent: { flex: 1, marginStart: 12, justifyContent: 'center' },
  cardName: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  cardDetail: { fontSize: 14, color: '#444', marginTop: 2 },
  cardMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  loading: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  errorIcon: { fontSize: 48, color: COLORS.error, fontWeight: 'bold' },
  error: { fontSize: 16, color: COLORS.error, marginTop: 8, textAlign: 'center' },
  retryButton: {
    marginTop: 12, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: COLORS.primary, borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: 'bold' },
  empty: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyContainer: { flexGrow: 1 },
  emptyIcon: { fontSize: 48, color: COLORS.success },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
});
