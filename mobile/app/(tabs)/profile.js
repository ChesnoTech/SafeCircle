import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, getMyReports } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { clearTokens } from '../../lib/api';
import { CONFIG } from '../../lib/config';
import { t, setLanguage, getLanguage, SUPPORTED_LANGUAGES } from '../../lib/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [currentLang, setCurrentLang] = useState(getLanguage());

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: isAuthenticated,
  });

  const { data: reports } = useQuery({
    queryKey: ['myReports'],
    queryFn: getMyReports,
    enabled: isAuthenticated,
  });

  const handleLanguageChange = useCallback(async (code) => {
    await setLanguage(code);
    setCurrentLang(code);
    setLangModalVisible(false);
    // Invalidate all queries to re-render with new language
    queryClient.invalidateQueries();
  }, [queryClient]);

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text style={styles.welcomeIcon}>🛡️</Text>
        <Text style={styles.welcomeTitle}>{t('auth.welcomeTitle')}</Text>
        <Text style={styles.welcomeText}>{t('auth.signInToReport')}</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>{t('auth.signIn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.registerButtonText}>{t('auth.createAccount')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleLogout = async () => {
    await clearTokens();
    logout();
  };

  const langLabel = SUPPORTED_LANGUAGES[currentLang]?.label || currentLang;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.name || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.name || 'User'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <Text style={styles.credibility}>
          {t('profile.credibility', { score: profile?.credibility_score || 50 })}
        </Text>
      </View>

      <View style={styles.stats}>
        <StatBox label={t('profile.missing')} count={reports?.missing?.length || 0} color={CONFIG.COLORS.primary} />
        <StatBox label={t('profile.lost')} count={reports?.lost?.length || 0} color={CONFIG.COLORS.warning} />
        <StatBox label={t('profile.found')} count={reports?.found?.length || 0} color={CONFIG.COLORS.success} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
        <MenuItem label={t('profile.notificationRadius')} value={`${profile?.notification_radius_km || 10} km`} />
        <TouchableOpacity onPress={() => setLangModalVisible(true)}>
          <MenuItem label={t('profile.language')} value={langLabel} />
        </TouchableOpacity>
        <MenuItem label={t('profile.country')} value={profile?.country || '—'} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('profile.signOut')}</Text>
      </TouchableOpacity>

      <Modal
        visible={langModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('profile.language')}</Text>
            <FlatList
              data={Object.entries(SUPPORTED_LANGUAGES)}
              keyExtractor={([code]) => code}
              renderItem={({ item: [code, { label }] }) => (
                <TouchableOpacity
                  style={[styles.langRow, code === currentLang && styles.langRowActive]}
                  onPress={() => handleLanguageChange(code)}
                >
                  <Text style={[styles.langText, code === currentLang && styles.langTextActive]}>
                    {label}
                  </Text>
                  {code === currentLang && <Text style={styles.langCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setLangModalVisible(false)}>
              <Text style={styles.modalCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatBox({ label, count, color }) {
  return (
    <View style={[styles.statBox, { borderTopColor: color }]}>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ label, value }) {
  return (
    <View style={styles.menuItem}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CONFIG.COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  welcomeIcon: { fontSize: 64 },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  welcomeText: { fontSize: 16, color: CONFIG.COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
  loginButton: {
    marginTop: 24, backgroundColor: CONFIG.COLORS.primary, paddingHorizontal: 48,
    paddingVertical: 14, borderRadius: 12,
  },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  registerButton: { marginTop: 12, paddingVertical: 14 },
  registerButtonText: { color: CONFIG.COLORS.primary, fontSize: 16 },
  profileHeader: { alignItems: 'center', padding: 24, backgroundColor: CONFIG.COLORS.card },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: CONFIG.COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  email: { fontSize: 14, color: CONFIG.COLORS.textSecondary, marginTop: 4 },
  credibility: { fontSize: 14, color: CONFIG.COLORS.success, marginTop: 8, fontWeight: '600' },
  stats: { flexDirection: 'row', padding: 12, gap: 12 },
  statBox: {
    flex: 1, backgroundColor: CONFIG.COLORS.card, padding: 16, borderRadius: 12,
    alignItems: 'center', borderTopWidth: 3, elevation: 1,
  },
  statCount: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: CONFIG.COLORS.textSecondary, marginTop: 4 },
  section: { marginTop: 12, backgroundColor: CONFIG.COLORS.card, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  menuLabel: { fontSize: 16, color: '#333' },
  menuValue: { fontSize: 16, color: CONFIG.COLORS.textMuted },
  logoutButton: {
    margin: 16, padding: 16, backgroundColor: CONFIG.COLORS.card, borderRadius: 12,
    alignItems: 'center', borderWidth: 1, borderColor: CONFIG.COLORS.primary,
  },
  logoutText: { color: CONFIG.COLORS.primary, fontSize: 16, fontWeight: '600' },
  // Language modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '60%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  langRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4,
  },
  langRowActive: { backgroundColor: '#EBF5FF' },
  langText: { fontSize: 18, color: '#333' },
  langTextActive: { color: CONFIG.COLORS.primary, fontWeight: '600' },
  langCheck: { fontSize: 18, color: CONFIG.COLORS.primary, fontWeight: 'bold' },
  modalClose: {
    marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: CONFIG.COLORS.card,
    alignItems: 'center', borderWidth: 1, borderColor: CONFIG.COLORS.border,
  },
  modalCloseText: { fontSize: 16, color: '#333' },
});
