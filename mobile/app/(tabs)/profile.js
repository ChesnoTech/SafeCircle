import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getProfile, getMyReports } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { clearTokens } from '../../lib/api';
import { CONFIG } from '../../lib/config';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

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

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text style={styles.welcomeIcon}>🛡️</Text>
        <Text style={styles.welcomeTitle}>Welcome to SafeCircle</Text>
        <Text style={styles.welcomeText}>Sign in to report and receive alerts</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.registerButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleLogout = async () => {
    await clearTokens();
    logout();
  };

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
          Credibility: {profile?.credibility_score || 50}/100
        </Text>
      </View>

      <View style={styles.stats}>
        <StatBox label="Missing" count={reports?.missing?.length || 0} color={CONFIG.COLORS.primary} />
        <StatBox label="Lost" count={reports?.lost?.length || 0} color={CONFIG.COLORS.warning} />
        <StatBox label="Found" count={reports?.found?.length || 0} color={CONFIG.COLORS.success} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <MenuItem label="Notification Radius" value={`${profile?.notification_radius_km || 10} km`} />
        <MenuItem label="Language" value={profile?.language || 'en'} />
        <MenuItem label="Country" value={profile?.country || '—'} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
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
});
