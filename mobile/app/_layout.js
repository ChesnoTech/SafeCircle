import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { CONFIG } from '../lib/config';
import { initI18n, t } from '../lib/i18n';
import { registerForPushNotifications, onNotificationTapped, getLastNotificationResponse } from '../lib/notifications';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const notifResponseListener = useRef();
  const router = useRouter();

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
    connectSocket();

    // Register push notifications after a short delay (wait for auth)
    const pushTimer = setTimeout(() => {
      registerForPushNotifications();
    }, 3000);

    // Handle notification taps (when app is open)
    notifResponseListener.current = onNotificationTapped((response) => {
      const data = response.notification.request.content.data;
      if (data?.reportId && data?.reportType === 'missing') {
        router.push(`/alert/${data.reportId}`);
      }
    });

    // Handle cold-start notification tap
    getLastNotificationResponse().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        if (data?.reportId && data?.reportType === 'missing') {
          router.push(`/alert/${data.reportId}`);
        }
      }
    });

    return () => {
      disconnectSocket();
      clearTimeout(pushTimer);
      if (notifResponseListener.current) {
        notifResponseListener.current.remove();
      }
    };
  }, []);

  if (!i18nReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={CONFIG.COLORS.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: CONFIG.COLORS.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: t('auth.signIn'), headerShown: false }} />
        <Stack.Screen name="verify-email" options={{ title: t('verification.verifyEmail'), headerShown: false }} />
        <Stack.Screen name="report/missing" options={{ title: t('reportTypes.missingPerson.title') }} />
        <Stack.Screen name="report/lost" options={{ title: t('reportTypes.lostItem.title') }} />
        <Stack.Screen name="report/found" options={{ title: t('reportTypes.foundSomething.title') }} />
        <Stack.Screen name="report/suspicious" options={{ title: t('reportTypes.suspiciousActivity.title') }} />
        <Stack.Screen name="alert/[id]" options={{ title: t('common.loading') }} />
        <Stack.Screen name="search" options={{ title: t('search.title') }} />
        <Stack.Screen name="notifications" options={{ title: t('notifications.title') }} />
        <Stack.Screen name="item/[id]" options={{ title: t('common.loading') }} />
        <Stack.Screen name="claim/[id]" options={{ title: t('claim.title') }} />
        <Stack.Screen name="trending" options={{ title: t('analytics.trending') }} />
        <Stack.Screen name="stories" options={{ title: t('resolution.storiesTitle') }} />
        <Stack.Screen name="items" options={{ title: t('matching.browseItems') }} />
        <Stack.Screen name="messages/index" options={{ title: t('messaging.conversations') }} />
        <Stack.Screen name="messages/[id]" options={{ title: t('messaging.conversations') }} />
      </Stack>
    </QueryClientProvider>
  );
}
