import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboard, getCredibilityScore } from '../lib/api';
import { CONFIG } from '../lib/config';
import { t } from '../lib/i18n';

function getRankDisplay(index) {
  if (index === 0) return { icon: '\uD83E\uDD47', color: '#FFD700' };
  if (index === 1) return { icon: '\uD83E\uDD48', color: '#C0C0C0' };
  if (index === 2) return { icon: '\uD83E\uDD49', color: '#CD7F32' };
  return { icon: `${index + 1}`, color: CONFIG.COLORS.textMuted };
}

function getScoreColor(score) {
  if (score >= 80) return CONFIG.COLORS.success;
  if (score >= 60) return CONFIG.COLORS.info;
  if (score >= 40) return CONFIG.COLORS.warning;
  return CONFIG.COLORS.primary;
}

function LeaderboardRow({ user, index }) {
  const rank = getRankDisplay(index);
  const scoreColor = getScoreColor(user.credibility_score);

  return (
    <View style={styles.row}>
      <View style={styles.rankContainer}>
        <Text style={[styles.rankText, { color: rank.color }]}>{rank.icon}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userStats}>
          {t('leaderboard.reports', { count: user.report_count || 0 })}
          {' \u00B7 '}
          {t('leaderboard.sightings', { count: user.sighting_count || 0 })}
        </Text>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreValue, { color: scoreColor }]}>{user.credibility_score}</Text>
        <View style={[styles.scoreBar, { width: `${user.credibility_score}%`, backgroundColor: scoreColor }]} />
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const { data: leaderboardData, isLoading, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: getLeaderboard,
  });

  const { data: myScore } = useQuery({
    queryKey: ['my-credibility'],
    queryFn: getCredibilityScore,
  });

  const leaders = leaderboardData?.leaderboard || [];

  return (
    <View style={styles.container}>
      {/* My score banner */}
      {myScore && (
        <View style={styles.myScoreBanner}>
          <Text style={styles.myScoreLabel}>{t('leaderboard.yourScore')}</Text>
          <Text style={styles.myScoreValue}>{myScore.score || 50}</Text>
          <Text style={styles.myScoreMax}>/100</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={leaders}
          keyExtractor={(item) => item.id || item.user_id}
          renderItem={({ item, index }) => (
            <LeaderboardRow user={item} index={index} />
          )}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                {t('leaderboard.topContributors', { count: leaders.length })}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{'\uD83C\uDFC6'}</Text>
              <Text style={styles.emptyText}>{t('leaderboard.noData')}</Text>
            </View>
          }
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={leaders.length === 0 && styles.emptyContainer}
        />
      )}
    </View>
  );
}

const { COLORS } = CONFIG;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  myScoreBanner: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center',
    backgroundColor: COLORS.info, paddingVertical: 16, paddingHorizontal: 20,
  },
  myScoreLabel: { color: '#E0E7FF', fontSize: 15, marginRight: 8 },
  myScoreValue: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  myScoreMax: { color: '#C7D2FE', fontSize: 18, marginLeft: 2 },
  listHeader: { padding: 16, paddingBottom: 8 },
  listHeaderText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    marginHorizontal: 12, marginTop: 6, borderRadius: 12, padding: 14,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  rankContainer: { width: 40, alignItems: 'center' },
  rankText: { fontSize: 22, fontWeight: 'bold' },
  userInfo: { flex: 1, marginLeft: 8 },
  userName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  userStats: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  scoreContainer: { alignItems: 'flex-end', width: 60 },
  scoreValue: { fontSize: 20, fontWeight: 'bold' },
  scoreBar: { height: 3, borderRadius: 2, marginTop: 4, maxWidth: 60 },
  empty: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyContainer: { flexGrow: 1 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, marginTop: 12 },
});
