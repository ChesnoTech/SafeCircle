import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStories, celebrateStory } from '../lib/api';
import { CONFIG } from '../lib/config';
import { t } from '../lib/i18n';

const RESOLUTION_ICONS = {
  found_safe: '\uD83C\uDF89',
  returned: '\uD83E\uDD1D',
  resolved: '\u2705',
  closed: '\uD83D\uDCCB',
};

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t('time.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return t('time.daysAgo', { count: Math.floor(hours / 24) });
}

function StoryCard({ story, onCelebrate }) {
  const icon = RESOLUTION_ICONS[story.resolution_type] || '\u2705';
  const typeLabel = story.report_type === 'missing'
    ? t('resolution.missingPerson')
    : story.report_type === 'lost'
    ? t('resolution.lostItem')
    : t('resolution.foundItem');

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardType}>{typeLabel}</Text>
          <Text style={styles.cardResolution}>
            {t(`resolution.${story.resolution_type}`)}
          </Text>
        </View>
        <Text style={styles.cardTime}>{getTimeAgo(story.created_at)}</Text>
      </View>

      {story.story && (
        <Text style={styles.storyText}>{story.story}</Text>
      )}

      {story.city && (
        <Text style={styles.cityText}>{story.city}</Text>
      )}

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.celebrateButton} onPress={() => onCelebrate(story.id)}>
          <Text style={styles.celebrateIcon}>{'\uD83C\uDF89'}</Text>
          <Text style={styles.celebrateCount}>{story.celebration_count || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function StoriesScreen() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stories', page],
    queryFn: () => getStories(page),
  });

  const celebrateMutation = useMutation({
    mutationFn: (storyId) => celebrateStory(storyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stories'] }),
  });

  const stories = data?.stories || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('resolution.storiesTitle')}</Text>
        <Text style={styles.headerSubtitle}>{t('resolution.storiesSubtitle')}</Text>
      </View>

      {isLoading && stories.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StoryCard
              story={item}
              onCelebrate={(id) => celebrateMutation.mutate(id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{'\uD83C\uDF1F'}</Text>
              <Text style={styles.emptyText}>{t('resolution.noStories')}</Text>
              <Text style={styles.emptySubtext}>{t('resolution.noStoriesSubtext')}</Text>
            </View>
          }
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={stories.length === 0 && styles.emptyContainer}
          onEndReached={() => {
            if (stories.length >= 20) setPage((p) => p + 1);
          }}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
}

const { COLORS } = CONFIG;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: COLORS.success, padding: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#bbf7d0', fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card, marginHorizontal: 12, marginTop: 10,
    borderRadius: 12, padding: 16, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { fontSize: 28, marginRight: 10 },
  cardHeaderText: { flex: 1 },
  cardType: { fontSize: 13, color: COLORS.textMuted, textTransform: 'uppercase', fontWeight: '600' },
  cardResolution: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
  cardTime: { fontSize: 11, color: COLORS.textMuted },
  storyText: {
    fontSize: 15, color: '#444', lineHeight: 22, marginTop: 12,
    fontStyle: 'italic', borderLeftWidth: 3, borderLeftColor: COLORS.success,
    paddingLeft: 12,
  },
  cityText: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  cardFooter: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  celebrateButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  celebrateIcon: { fontSize: 20, marginRight: 6 },
  celebrateCount: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  empty: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyContainer: { flexGrow: 1 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
});
