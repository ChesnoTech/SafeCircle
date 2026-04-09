import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CONFIG } from '../lib/config';
import { t } from '../lib/i18n';
import { api } from '../lib/api';

const TIER_COLORS = {
  CRITICAL: CONFIG.COLORS.primary,
  HIGH: CONFIG.COLORS.warning,
  MEDIUM: CONFIG.COLORS.info,
  LOW: CONFIG.COLORS.success,
};

const TYPE_ICONS = {
  alert: '\uD83D\uDD14',
  missing: '\uD83D\uDEA8',
  sighting: '\uD83D\uDC41',
  match: '\u2705',
  message: '\uD83D\uDCAC',
};

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t('time.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return t('time.daysAgo', { count: Math.floor(hours / 24) });
}

function NotificationItem({ item, onPress, onMarkRead }) {
  const tierColor = TIER_COLORS[item.tier] || CONFIG.COLORS.textMuted;
  const icon = TYPE_ICONS[item.type] || TYPE_ICONS.alert;

  return (
    <TouchableOpacity
      style={[styles.notifCard, !item.read && styles.notifUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.tierStripe, { backgroundColor: tierColor }]} />
      <Text style={styles.notifIcon}>{icon}</Text>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.notifTime}>{getTimeAgo(item.created_at)}</Text>
      </View>
      {!item.read && (
        <TouchableOpacity style={styles.readDot} onPress={() => onMarkRead(item.id)}>
          <View style={styles.unreadDot} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => api(`/notifications/history?page=${page}&limit=20`),
  });

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const markReadMutation = useMutation({
    mutationFn: (id) => api(`/notifications/history/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api('/notifications/history/read-all', { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handlePress = (item) => {
    if (!item.read) {
      markReadMutation.mutate(item.id);
    }
    // Navigate based on report type
    if (item.report_id && item.report_type === 'missing') {
      router.push(`/alert/${item.report_id}`);
    } else if (item.report_id && (item.report_type === 'lost' || item.report_type === 'found')) {
      router.push(`/item/${item.report_id}?type=${item.report_type}`);
    }
  };

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllButton} onPress={() => markAllReadMutation.mutate()}>
          <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
        </TouchableOpacity>
      )}

      {isLoading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onPress={handlePress}
              onMarkRead={(id) => markReadMutation.mutate(id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{'\uD83D\uDD14'}</Text>
              <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
              <Text style={styles.emptySubtext}>{t('notifications.emptySubtext')}</Text>
            </View>
          }
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={notifications.length === 0 && styles.emptyContainer}
        />
      )}
    </View>
  );
}

const { COLORS } = CONFIG;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  markAllButton: {
    padding: 12, backgroundColor: COLORS.card, borderBottomWidth: 1,
    borderBottomColor: '#eee', alignItems: 'center',
  },
  markAllText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  notifCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, overflow: 'hidden',
  },
  notifUnread: { backgroundColor: '#FEF3F2' },
  tierStripe: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  notifIcon: { fontSize: 24, marginLeft: 8, marginRight: 10 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  notifTitleUnread: { fontWeight: 'bold' },
  notifBody: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  notifTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  readDot: { padding: 8 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  empty: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyContainer: { flexGrow: 1 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
});
