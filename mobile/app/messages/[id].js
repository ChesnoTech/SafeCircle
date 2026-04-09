import { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMessages, sendMessage, getToken } from '../../lib/api';
import { onNewMessage } from '../../lib/socket';
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

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const flatListRef = useRef(null);

  // Decode current user ID from token
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentUserId(payload.id);
        } catch { /* ignore */ }
      }
    })();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => getMessages(conversationId),
    refetchInterval: 10000,
  });

  // Real-time message updates
  useEffect(() => {
    const unsub = onNewMessage((payload) => {
      if (payload.conversationId === conversationId) {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      }
    });
    return unsub;
  }, [conversationId, queryClient]);

  const messages = data?.messages || [];

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    try {
      await sendMessage(conversationId, body);
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch {
      setText(body);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender_id === currentUserId;
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        {!isMe && <Text style={styles.senderName}>{item.sender_name}</Text>}
        <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.body}</Text>
        <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
          {getTimeAgo(item.created_at)}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('messaging.typeMessage')}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || sending) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendText}>{t('messaging.send')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CONFIG.COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12, paddingBottom: 4 },
  bubble: {
    maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8,
  },
  bubbleMe: {
    backgroundColor: CONFIG.COLORS.primary, alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: CONFIG.COLORS.card, alignSelf: 'flex-start',
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: CONFIG.COLORS.border,
  },
  senderName: { fontSize: 12, fontWeight: 'bold', color: CONFIG.COLORS.info, marginBottom: 2 },
  messageText: { fontSize: 15, color: CONFIG.COLORS.text, lineHeight: 20 },
  messageTextMe: { color: '#fff' },
  messageTime: { fontSize: 11, color: CONFIG.COLORS.textSecondary, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeMe: { color: 'rgba(255,255,255,0.7)' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 8,
    backgroundColor: CONFIG.COLORS.card, borderTopWidth: 1, borderTopColor: CONFIG.COLORS.border,
  },
  input: {
    flex: 1, backgroundColor: CONFIG.COLORS.background, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
    maxHeight: 100, borderWidth: 1, borderColor: CONFIG.COLORS.border,
  },
  sendButton: {
    backgroundColor: CONFIG.COLORS.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, marginLeft: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
