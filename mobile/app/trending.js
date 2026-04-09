import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getTrendingAreas } from '../lib/api';
import { CONFIG } from '../lib/config';
import { t } from '../lib/i18n';

function getRankIcon(index) {
  if (index === 0) return '\uD83E\uDD47';
  if (index === 1) return '\uD83E\uDD48';
  if (index === 2) return '\uD83E\uDD49';
  return `${index + 1}`;
}

function getHeatLevel(count, maxCount) {
  const ratio = count / maxCount;
  if (ratio >= 0.7) return { label: t('analytics.highActivity'), color: CONFIG.COLORS.primary };
  if (ratio >= 0.4) return { label: t('analytics.mediumActivity'), color: CONFIG.COLORS.warning };
  return { label: t('analytics.lowActivity'), color: CONFIG.COLORS.success };
}

function TrendingCard({ area, index, maxCount }) {
  const heat = getHeatLevel(parseInt(area.report_count), maxCount);
  const latLabel = parseFloat(area.lat_grid).toFixed(2);
  const lngLabel = parseFloat(area.lng_grid).toFixed(2);
  const timeAgo = getTimeAgo(area.latest_report);

  return (
    <View style={styles.card}>
      <View style={styles.rankContainer}>
        <Text style={styles.rankIcon}>{getRankIcon(index)}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardLocation}>
          {t('analytics.gridArea', { lat: latLabel, lng: lngLabel })}
        </Text>
        <Text style={styles.cardCount}>
          {t('analytics.reportsCount', { count: area.report_count })}
        </Text>
        <Text style={styles.cardTime}>{t('analytics.latestReport')}: {timeAgo}</Text>
      </View>
      <View style={[styles.heatBadge, { backgroundColor: heat.color + '20', borderColor: heat.color }]}>
        <Text style={[styles.heatText, { color: heat.color }]}>{heat.label}</Text>
      </View>
    </View>
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

export default function TrendingScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trending'],
    queryFn: getTrendingAreas,
  });

  const areas = data?.areas || [];
  const maxCount = areas.length > 0 ? parseInt(areas[0].report_count) : 1;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('analytics.trendingAreas')}</Text>
        <Text style={styles.headerSubtitle}>{t('analytics.trendingDesc')}</Text>
      </View>

      <FlatList
        data={areas}
        keyExtractor={(item, i) => `${item.lat_grid}-${item.lng_grid}-${i}`}
        renderItem={({ item, index }) => (
          <TrendingCard area={item} index={index} maxCount={maxCount} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\uD83D\uDCCA'}</Text>
            <Text style={styles.emptyText}>{t('analytics.noTrending')}</Text>
          </View>
        }
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={areas.length === 0 && styles.emptyContainer}
      />
    </View>
  );
}

const { COLORS } = CONFIG;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: COLORS.primary, padding: 16,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#fecaca', fontSize: 13, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  rankContainer: { width: 40, alignItems: 'center' },
  rankIcon: { fontSize: 22 },
  cardContent: { flex: 1, marginLeft: 8 },
  cardLocation: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardCount: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  cardTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  heatBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, marginLeft: 8,
  },
  heatText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  empty: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyContainer: { flexGrow: 1 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, marginTop: 12 },
});
