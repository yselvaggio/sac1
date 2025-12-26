import React from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/theme';

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait for navigation to be ready
    if (!navigationState?.key) return;
    if (isLoading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    
    if (!user && inTabsGroup) {
      // User is not authenticated but trying to access protected routes
      // Force navigation to login
      router.replace('/');
    } else if (user && !inTabsGroup) {
      // User is authenticated but on the login screen
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, navigationState?.key]);

  // Show nothing while loading to prevent flash
  if (isLoading) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
