import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocationStore } from '../lib/store';
import { api } from '../lib/api';
import { CONFIG } from '../lib/config';
import { t } from '../lib/i18n';

const SEVERITY_CONFIG = {
  low: { color: CONFIG.COLORS.success, icon: '\uD83D\uDFE2' },
  medium: { color: CONFIG.COLORS.warning, icon: '\uD83D\uDFE1' },
  high: { color: CONFIG.COLORS.primary, icon: '\uD83D\uDD34' },
  urgent: { color: '#7C3AED', icon: '\uD83D\uDFE3' },
};

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t('time.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return t('time.daysAgo', { count: Math.floor(hours / 24) });
}

function IntelCard({ report }) {
  const sev = SEVERITY_CONFIG[report.severity] || SEVERITY_CONFIG.low;
  const distanceKm = report.distance_m ? (report.distance_m / 1000).toFixed(1) : '?';

  return (
    <View style={styles.card}>
      <View style={[styles.severityStripe, { backgroundColor: sev.color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.severityIcon}>{sev.icon}</Text>
          <View style={[styles.severityBadge, { backgroundColor: sev.color + '20', borderColor: sev.color }]}>
            <Text style={[styles.severityText, { color: sev.color }]}>{report.severity}</Text>
          </View>
          <Text style={styles.cardTime}>{getTimeAgo(report.created_at)}</Text>
        </View>
        <Text style={styles.cardDesc}>{report.description}</Text>
        {report.address && (
          <Text style={styles.cardLocation}>{report.address}</Text>
        )}
        <Text style={styles.cardMeta}>
          {distanceKm} km {t('intel.away')}
          {report.category ? ` \u00B7 ${report.category}` : ''}
        </Text>
      </View>
    </View>
  );
}

export default function IntelScreen() {
  const { latitude, longitude } = useLocationStore();
  const [severity, setSeverity] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['intel-nearby', latitude, longitude],
    queryFn: () => api(`/intel/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${CONFIG.DEFAULT_RADIUS_KM}`),
    enabled: !!latitude && !!longitude,
  });

  const allReports = data?.reports || [];
  const reports = severity === 'all'
    ? allReports
    : allReports.filter((r) => r.severity === severity);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('intel.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('intel.subtitle', { count: allReports.length })}
        </Text>
      </View>

      <View style={styles.filters}>
        {['all', 'urgent', 'high', 'medium', 'low'].map((sev) => {
          const isActive = severity === sev;
          return (
            <TouchableOpacity
              key={sev}
              style={[styles.filterBtn, isActive && styles.filterBtnActive]}
              onPress={() => setSeverity(sev)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {sev === 'all' ? t('search.all') : t(`report.${sev}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <IntelCard report={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{'\uD83D\uDEE1\uFE0F'}</Text>
              <Text style={styles.emptyText}>{t('intel.noReports')}</Text>
            </View>
          }
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={reports.length === 0 && styles.emptyContainer}
        />
      )}
    </View>
  );
}

const { COLORS } = CONFIG;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#7C3AED', padding: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#DDD6FE', fontSize: 13, marginTop: 4 },
  filters: {
    flexDirection: 'row', backgroundColor: COLORS.card, paddingVertical: 8,
    paddingHorizontal: 8, gap: 6,
  },
  filterBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: 8, backgroundColor: '#f5f5f5',
  },
  filterBtnActive: { backgroundColor: '#7C3AED' },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.card, marginHorizontal: 12,
    marginTop: 8, borderRadius: 12, overflow: 'hidden',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  severityStripe: { width: 4 },
  cardContent: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  severityIcon: { fontSize: 16 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  severityText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  cardTime: { fontSize: 11, color: COLORS.textMuted, marginLeft: 'auto' },
  cardDesc: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  cardLocation: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
  cardMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  empty: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyContainer: { flexGrow: 1 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, marginTop: 12 },
});
