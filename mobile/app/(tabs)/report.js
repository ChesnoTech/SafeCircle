import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const reportTypes = [
  {
    id: 'missing',
    icon: '🚨',
    title: 'Missing Person',
    subtitle: 'Report a missing person — instant alert to nearby users',
    color: '#DC2626',
    route: '/report/missing',
  },
  {
    id: 'lost',
    icon: '📦',
    title: 'Lost Item',
    subtitle: 'Report a lost item — automatic matching with found items',
    color: '#F59E0B',
    route: '/report/lost',
  },
  {
    id: 'found',
    icon: '🔍',
    title: 'Found Something',
    subtitle: 'Report a found item or person — help reunite',
    color: '#22C55E',
    route: '/report/found',
  },
  {
    id: 'suspicious',
    icon: '👁️',
    title: 'Suspicious Activity',
    subtitle: 'Anonymous report — helps detect patterns',
    color: '#6366F1',
    route: '/report/suspicious',
  },
];

export default function ReportScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What would you like to report?</Text>

      {reportTypes.map((type) => (
        <TouchableOpacity
          key={type.id}
          style={[styles.card, { borderLeftColor: type.color }]}
          onPress={() => router.push(type.route)}
        >
          <Text style={styles.icon}>{type.icon}</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{type.title}</Text>
            <Text style={styles.cardSubtitle}>{type.subtitle}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3,
  },
  icon: { fontSize: 32, marginRight: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  cardSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  arrow: { fontSize: 28, color: '#ccc' },
});
