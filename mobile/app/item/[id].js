import { useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getLostItem, getFoundItem, getLostItemMatches } from '../../lib/api';
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

function getCategoryIcon(category) {
  const icons = {
    documents: '\uD83D\uDCC4', phone: '\uD83D\uDCF1', wallet: '\uD83D\uDC5B',
    keys: '\uD83D\uDD11', bag: '\uD83C\uDF92', electronics: '\uD83D\uDCBB',
    jewelry: '\uD83D\uDC8D', clothing: '\uD83D\uDC55', glasses: '\uD83D\uDC53',
    pet: '\uD83D\uDC3E', other: '\uD83D\uDCE6',
  };
  return icons[category] || '\uD83D\uDCE6';
}

function MatchCard({ match, onPress }) {
  const scorePercent = Math.round((match.score || 0) * 100);
  const scoreColor = scorePercent >= 80 ? CONFIG.COLORS.success
    : scorePercent >= 60 ? CONFIG.COLORS.warning
    : CONFIG.COLORS.textMuted;

  return (
    <TouchableOpacity style={styles.matchCard} onPress={onPress} activeOpacity={0.7}>
      {match.photo_url ? (
        <Image source={{ uri: match.photo_url }} style={styles.matchPhoto} />
      ) : (
        <View style={[styles.matchPhoto, styles.matchPhotoPlaceholder]}>
          <Text style={styles.matchPhotoIcon}>{getCategoryIcon(match.category)}</Text>
        </View>
      )}
      <View style={styles.matchContent}>
        <Text style={styles.matchCategory}>{match.category}</Text>
        <Text style={styles.matchDesc} numberOfLines={2}>{match.description}</Text>
        {match.found_address && (
          <Text style={styles.matchLocation} numberOfLines={1}>{match.found_address}</Text>
        )}
        <Text style={styles.matchTime}>{getTimeAgo(match.created_at)}</Text>
      </View>
      <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
        <Text style={[styles.scoreText, { color: scoreColor }]}>{scorePercent}%</Text>
        <Text style={styles.scoreLabel}>{t('matching.match')}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ItemDetailScreen() {
  const { id, type = 'lost' } = useLocalSearchParams();
  const router = useRouter();
  const [showMatches, setShowMatches] = useState(true);

  const fetchItem = type === 'found' ? getFoundItem : getLostItem;

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', type, id],
    queryFn: () => fetchItem(id),
  });

  const { data: matchesData } = useQuery({
    queryKey: ['item-matches', id],
    queryFn: () => getLostItemMatches(id),
    enabled: type === 'lost',
  });

  if (isLoading || !item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
      </View>
    );
  }

  const matches = matchesData?.matches || [];
  const isLost = type === 'lost';

  return (
    <ScrollView style={styles.container}>
      {/* Item header */}
      <View style={styles.header}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.itemPhoto} />
        ) : (
          <View style={[styles.itemPhoto, styles.photoPlaceholder]}>
            <Text style={styles.placeholderIcon}>{getCategoryIcon(item.category)}</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <View style={[styles.typeBadge, isLost ? styles.lostBadge : styles.foundBadge]}>
            <Text style={styles.typeBadgeText}>
              {isLost ? t('matching.lost') : t('matching.found')}
            </Text>
          </View>
          <Text style={styles.category}>{item.category}</Text>
          {item.color && <Text style={styles.detail}>{t('matching.color')}: {item.color}</Text>}
          {item.brand && <Text style={styles.detail}>{t('matching.brand')}: {item.brand}</Text>}
          <Text style={styles.time}>{getTimeAgo(item.created_at)}</Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('matching.description')}</Text>
        <Text style={styles.sectionBody}>{item.description}</Text>
      </View>

      {/* Location */}
      {(item.lost_address || item.found_address) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isLost ? t('matching.lostLocation') : t('matching.foundLocation')}
          </Text>
          <Text style={styles.sectionBody}>{item.lost_address || item.found_address}</Text>
        </View>
      )}

      {/* Reward */}
      {item.reward && (
        <View style={styles.rewardSection}>
          <Text style={styles.rewardIcon}>{'\uD83C\uDFC6'}</Text>
          <Text style={styles.rewardText}>{t('matching.rewardOffered')}</Text>
        </View>
      )}

      {/* Status */}
      <View style={styles.section}>
        <View style={[styles.statusBadge, item.status === 'available' ? styles.statusAvailable : styles.statusResolved]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {/* Matches (for lost items) */}
      {isLost && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.matchesHeader}
            onPress={() => setShowMatches(!showMatches)}
          >
            <Text style={styles.sectionTitle}>
              {t('matching.potentialMatches', { count: matches.length })}
            </Text>
            <Text style={styles.toggleIcon}>{showMatches ? '\u25B2' : '\u25BC'}</Text>
          </TouchableOpacity>

          {showMatches && matches.length === 0 && (
            <Text style={styles.emptyText}>{t('matching.noMatches')}</Text>
          )}

          {showMatches && matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onPress={() => router.push(`/claim/${match.found_item_id || match.id}?itemType=found_item`)}
            />
          ))}
        </View>
      )}

      {/* Claim button (for found items) */}
      {!isLost && item.status === 'available' && (
        <TouchableOpacity
          style={styles.claimButton}
          onPress={() => router.push(`/claim/${id}?itemType=found_item`)}
        >
          <Text style={styles.claimButtonText}>{t('matching.claimThis')}</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const { COLORS } = CONFIG;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 16 },
  itemPhoto: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#eee' },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  placeholderIcon: { fontSize: 48 },
  headerInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  typeBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, marginBottom: 6,
  },
  lostBadge: { backgroundColor: '#FEE2E2' },
  foundBadge: { backgroundColor: '#DCFCE7' },
  typeBadgeText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  category: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, textTransform: 'capitalize' },
  detail: { fontSize: 14, color: '#444', marginTop: 2 },
  time: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  section: { backgroundColor: COLORS.card, padding: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  sectionBody: { fontSize: 15, color: '#555', lineHeight: 22 },
  rewardSection: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB',
    padding: 16, marginTop: 8,
  },
  rewardIcon: { fontSize: 24, marginRight: 10 },
  rewardText: { fontSize: 15, fontWeight: '600', color: '#92400E' },
  statusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12,
  },
  statusAvailable: { backgroundColor: '#DCFCE7' },
  statusResolved: { backgroundColor: '#E0E7FF' },
  statusText: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' },
  matchesHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  toggleIcon: { fontSize: 14, color: COLORS.textMuted },
  matchCard: {
    flexDirection: 'row', backgroundColor: '#f9f9f9', borderRadius: 10,
    padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#eee',
  },
  matchPhoto: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#eee' },
  matchPhotoPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  matchPhotoIcon: { fontSize: 28 },
  matchContent: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  matchCategory: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, textTransform: 'capitalize' },
  matchDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  matchLocation: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  matchTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  scoreBadge: {
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8,
  },
  scoreText: { fontSize: 16, fontWeight: 'bold' },
  scoreLabel: { fontSize: 10, color: COLORS.textMuted },
  emptyText: { color: COLORS.textMuted, fontStyle: 'italic' },
  claimButton: {
    backgroundColor: COLORS.success, padding: 16, borderRadius: 12,
    alignItems: 'center', margin: 16,
  },
  claimButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
