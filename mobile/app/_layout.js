import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { CONFIG } from '../lib/config';

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

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
        <Stack.Screen name="login" options={{ title: 'Sign In', headerShown: false }} />
        <Stack.Screen name="report/missing" options={{ title: 'Report Missing Person' }} />
        <Stack.Screen name="report/lost" options={{ title: 'Report Lost Item' }} />
        <Stack.Screen name="report/found" options={{ title: 'Report Found Item' }} />
        <Stack.Screen name="report/suspicious" options={{ title: 'Report Suspicious Activity' }} />
        <Stack.Screen name="alert/[id]" options={{ title: 'Alert Details' }} />
      </Stack>
    </QueryClientProvider>
  );
}
