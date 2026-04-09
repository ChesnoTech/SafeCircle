import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '../lib/config';
import { t, setLanguage, getLanguage, SUPPORTED_LANGUAGES } from '../lib/i18n';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 'safecircle_onboarding_done';

export async function isOnboardingDone() {
  try {
    const val = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markOnboardingDone() {
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  } catch {
    // best-effort
  }
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState(getLanguage());
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  const handleLanguageSelect = useCallback(async (code) => {
    await setLanguage(code);
    setSelectedLang(code);
  }, []);

  const handleLocationPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(status === 'granted');
  }, []);

  const handleNotificationPermission = useCallback(async () => {
    // Expo notifications permission
    try {
      const { Notifications } = require('expo-notifications');
      if (Notifications) {
        const { status } = await Notifications.requestPermissionsAsync();
        setNotifGranted(status === 'granted');
        return;
      }
    } catch {
      // expo-notifications not installed
    }
    setNotifGranted(true);
  }, []);

  const handleFinish = useCallback(async () => {
    await markOnboardingDone();
    router.replace('/');
  }, [router]);

  const nextStep = () => {
    if (step < 2) setStep(step + 1);
    else handleFinish();
  };

  return (
    <View style={styles.container}>
      {/* Step indicators */}
      <View style={styles.indicators}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      {/* Step 0: Language */}
      {step === 0 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepIcon}>🌍</Text>
          <Text style={styles.stepTitle}>{t('onboarding.chooseLanguage')}</Text>

          <FlatList
            data={Object.entries(SUPPORTED_LANGUAGES)}
            keyExtractor={([code]) => code}
            style={styles.langList}
            renderItem={({ item: [code, { label }] }) => (
              <TouchableOpacity
                style={[styles.langRow, code === selectedLang && styles.langRowActive]}
                onPress={() => handleLanguageSelect(code)}
              >
                <Text style={[styles.langText, code === selectedLang && styles.langTextActive]}>
                  {label}
                </Text>
                {code === selectedLang && <Text style={styles.langCheck}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Step 1: Location */}
      {step === 1 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepIcon}>📍</Text>
          <Text style={styles.stepTitle}>{t('onboarding.enableLocation')}</Text>
          <Text style={styles.stepSubtitle}>{t('onboarding.enableLocationSubtitle')}</Text>

          {locationGranted ? (
            <View style={styles.grantedBadge}>
              <Text style={styles.grantedIcon}>✓</Text>
              <Text style={styles.grantedText}>{t('onboarding.locationEnabled')}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.permissionButton} onPress={handleLocationPermission}>
              <Text style={styles.permissionButtonText}>{t('onboarding.enableLocation')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Step 2: Notifications */}
      {step === 2 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepIcon}>🔔</Text>
          <Text style={styles.stepTitle}>{t('onboarding.enableNotifications')}</Text>
          <Text style={styles.stepSubtitle}>{t('onboarding.enableNotificationsSubtitle')}</Text>

          {notifGranted ? (
            <View style={styles.grantedBadge}>
              <Text style={styles.grantedIcon}>✓</Text>
              <Text style={styles.grantedText}>{t('onboarding.notificationsEnabled')}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.permissionButton} onPress={handleNotificationPermission}>
              <Text style={styles.permissionButtonText}>{t('onboarding.enableNotifications')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        {step < 2 ? (
          <>
            <TouchableOpacity onPress={handleFinish}>
              <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
              <Text style={styles.nextButtonText}>{t('common.next')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.nextButton, styles.getStartedButton]} onPress={handleFinish}>
            <Text style={styles.nextButtonText}>{t('onboarding.getStarted')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  indicators: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  dotActive: { backgroundColor: CONFIG.COLORS.primary, width: 24 },
  stepContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  stepIcon: { fontSize: 64, marginBottom: 16 },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  stepSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  langList: { width: '100%', marginTop: 16 },
  langRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, marginBottom: 6,
    backgroundColor: '#f9f9f9',
  },
  langRowActive: { backgroundColor: '#EBF5FF', borderWidth: 1, borderColor: CONFIG.COLORS.primary },
  langText: { fontSize: 18, color: '#333' },
  langTextActive: { color: CONFIG.COLORS.primary, fontWeight: '600' },
  langCheck: { fontSize: 20, color: CONFIG.COLORS.primary, fontWeight: 'bold' },
  permissionButton: {
    marginTop: 32, backgroundColor: CONFIG.COLORS.primary, paddingHorizontal: 48,
    paddingVertical: 16, borderRadius: 14,
  },
  permissionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  grantedBadge: {
    marginTop: 32, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12,
  },
  grantedIcon: { fontSize: 20, color: CONFIG.COLORS.success },
  grantedText: { fontSize: 16, color: '#166534', fontWeight: '600' },
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16,
  },
  skipText: { fontSize: 16, color: '#999' },
  nextButton: {
    backgroundColor: CONFIG.COLORS.primary, paddingHorizontal: 32,
    paddingVertical: 14, borderRadius: 12,
  },
  getStartedButton: { flex: 1 },
  nextButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
});
