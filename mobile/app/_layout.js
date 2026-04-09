import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { CONFIG } from '../lib/config';
import { initI18n, t } from '../lib/i18n';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
    connectSocket();
    return () => disconnectSocket();
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
        <Stack.Screen name="messages/index" options={{ title: t('messaging.conversations') }} />
        <Stack.Screen name="messages/[id]" options={{ title: t('messaging.conversations') }} />
      </Stack>
    </QueryClientProvider>
  );
}
