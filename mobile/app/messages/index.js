import { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getConversations } from '../../lib/api';
import { onNewConversation, onNewMessage } from '../../lib/socket';
import { CONFIG } from '../../lib/config';
import { t } from '../../lib/i18n';

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t('time.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return t('time.daysAgo', { count: Math.floor(hours / 24) });
}

export default function ConversationsScreen() {
  const router = useRouter();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => getConversations(),
  });

  // Listen for real-time new messages to refresh the list
  useEffect(() => {
    const unsubMsg = onNewMessage(() => refetch());
    const unsubConvo = onNewConversation(() => refetch());
    return () => {
      unsubMsg();
      unsubConvo();
    };
  }, [refetch]);

  const conversations = data?.conversations || [];

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/messages/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.userName} numberOfLines={1}>
          {item.other_user_name || '...'}
        </Text>
        <Text style={styles.time}>{getTimeAgo(item.last_message_at)}</Text>
      </View>
      <Text style={styles.preview} numberOfLines={1}>
        {item.last_message || '...'}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.reportType}>{item.report_type}</Text>
        {item.unread_count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unread_count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('messaging.noConversations')}</Text>
          <Text style={styles.emptyHint}>{t('messaging.noConversationsHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CONFIG.COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12 },
  card: {
    backgroundColor: CONFIG.COLORS.card, padding: 14, borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: CONFIG.COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontSize: 16, fontWeight: 'bold', color: CONFIG.COLORS.text, flex: 1 },
  time: { fontSize: 12, color: CONFIG.COLORS.textSecondary, marginLeft: 8 },
  preview: { fontSize: 14, color: CONFIG.COLORS.textSecondary, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  reportType: { fontSize: 12, color: CONFIG.COLORS.info, textTransform: 'capitalize' },
  badge: {
    backgroundColor: CONFIG.COLORS.primary, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, minWidth: 20, alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: CONFIG.COLORS.text, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: CONFIG.COLORS.textSecondary, textAlign: 'center' },
});
