import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getNearbyLost, getNearbyFound } from '../lib/api';
import { useLocationStore } from '../lib/store';
import { CONFIG } from '../lib/config';
import { t } from '../lib/i18n';

const CATEGORY_ICONS = {
  documents: '\uD83D\uDCC4', phone: '\uD83D\uDCF1', wallet: '\uD83D\uDC5B',
  keys: '\uD83D\uDD11', bag: '\uD83C\uDF92', electronics: '\uD83D\uDCBB',
  jewelry: '\uD83D\uDC8D', clothing: '\uD83D\uDC55', glasses: '\uD83D\uDC53',
  pet: '\uD83D\uDC3E', other: '\uD83D\uDCE6',
};

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t('time.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return t('time.daysAgo', { count: Math.floor(hours / 24) });
}

function ItemCard({ item, type, onPress }) {
  const icon = CATEGORY_ICONS[item.category] || '\uD83D\uDCE6';
  const distanceKm = item.distance_m ? (item.distance_m / 1000).toFixed(1) : '?';
  const isLost = type === 'lost';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={styles.cardPhoto} />
      ) : (
        <View style={[styles.cardPhoto, styles.cardPhotoPlaceholder]}>
          <Text style={styles.cardPhotoIcon}>{icon}</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.cardCategory}>{item.category}</Text>
          <View style={[styles.typeBadge, isLost ? styles.lostBadge : styles.foundBadge]}>
            <Text style={styles.typeBadgeText}>
              {isLost ? t('matching.lost') : t('matching.found')}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        {item.color && <Text style={styles.cardDetail}>{t('matching.color')}: {item.color}</Text>}
        <Text style={styles.cardMeta}>
          {distanceKm} km {'\u00B7'} {getTimeAgo(item.created_at)}
          {item.reward ? ` ${'\u00B7'} ${'\uD83C\uDFC6'} ${t('matching.rewardOffered')}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ItemsScreen() {
  const router = useRouter();
  const { latitude, longitude } = useLocationStore();
  const [activeTab, setActiveTab] = useState('lost');

  const { data: lostData, isLoading: lostLoading, refetch: refetchLost } = useQuery({
    queryKey: ['nearby-lost', latitude, longitude],
    queryFn: () => getNearbyLost(latitude, longitude, CONFIG.DEFAULT_RADIUS_KM),
    enabled: !!latitude && !!longitude,
  });

  const { data: foundData, isLoading: foundLoading, refetch: refetchFound } = useQuery({
    queryKey: ['nearby-found', latitude, longitude],
    queryFn: () => getNearbyFound(latitude, longitude, CONFIG.DEFAULT_RADIUS_KM),
    enabled: !!latitude && !!longitude,
  });

  const isLostTab = activeTab === 'lost';
  const items = isLostTab ? (lostData?.items || []) : (foundData?.items || []);
  const isLoading = isLostTab ? lostLoading : foundLoading;
  const refetch = isLostTab ? refetchLost : refetchFound;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('matching.browseItems')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('matching.nearbyItems', { radius: CONFIG.DEFAULT_RADIUS_KM })}
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, isLostTab && styles.tabActive]}
          onPress={() => setActiveTab('lost')}
        >
          <Text style={[styles.tabText, isLostTab && styles.tabTextActive]}>
            {t('matching.lost')} ({lostData?.items?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, !isLostTab && styles.tabActive]}
          onPress={() => setActiveTab('found')}
        >
          <Text style={[styles.tabText, !isLostTab && styles.tabTextActive]}>
            {t('matching.found')} ({foundData?.items?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              type={activeTab}
              onPress={() => router.push(`/item/${item.id}?type=${activeTab}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{isLostTab ? '\uD83D\uDCE6' : '\u2705'}</Text>
              <Text style={styles.emptyText}>
                {isLostTab ? t('matching.noLostItems') : t('matching.noFoundItems')}
              </Text>
            </View>
          }
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={items.length === 0 && styles.emptyContainer}
        />
      )}
    </View>
  );
}

const { COLORS } = CONFIG;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: COLORS.warning, padding: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#FEF3C7', fontSize: 13, marginTop: 4 },
  tabs: {
    flexDirection: 'row', backgroundColor: COLORS.card, paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 8, marginHorizontal: 4,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.card, marginHorizontal: 12,
    marginTop: 10, borderRadius: 12, padding: 12, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  cardPhoto: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#eee' },
  cardPhotoPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  cardPhotoIcon: { fontSize: 32 },
  cardContent: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCategory: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, textTransform: 'capitalize' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  lostBadge: { backgroundColor: '#FEE2E2' },
  foundBadge: { backgroundColor: '#DCFCE7' },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  cardDetail: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  empty: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyContainer: { flexGrow: 1 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, marginTop: 12 },
});
