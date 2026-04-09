import { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { searchReports } from '../lib/api';
import { useLocationStore } from '../lib/store';
import { CONFIG } from '../lib/config';
import { t } from '../lib/i18n';

const SEARCH_TYPES = ['all', 'missing', 'lost', 'found'];

export default function SearchScreen() {
  const router = useRouter();
  const { latitude, longitude } = useLocationStore();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true);
    try {
      const data = await searchReports(q, type, latitude, longitude, CONFIG.DEFAULT_RADIUS_KM);
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [query, type, latitude, longitude]);

  const allResults = results
    ? [
        ...(results.missing || []).map((r) => ({ ...r, _type: 'missing' })),
        ...(results.lost || []).map((r) => ({ ...r, _type: 'lost' })),
        ...(results.found || []).map((r) => ({ ...r, _type: 'found' })),
      ]
    : [];

  const renderItem = ({ item }) => {
    const isMissing = item._type === 'missing';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => isMissing ? router.push(`/alert/${item.id}`) : null}
      >
        <View style={styles.cardRow}>
          {item.photo_url && (
            <Image source={{ uri: item.photo_url }} style={styles.thumb} />
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name || item.category || item.description?.slice(0, 40)}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{item._type}</Text>
            </View>
            {item.description && (
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            )}
            <Text style={styles.cardStatus}>{item.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder={t('search.placeholder')}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>{t('common.search')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.typeRow}>
        {SEARCH_TYPES.map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.typeBtn, type === st && styles.typeBtnActive]}
            onPress={() => setType(st)}
          >
            <Text style={[styles.typeBtnText, type === st && styles.typeBtnTextActive]}>
              {t(`search.${st}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator size="large" color={CONFIG.COLORS.primary} style={styles.loader} />}

      {results && allResults.length === 0 && !loading && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('common.noResults')}</Text>
        </View>
      )}

      <FlatList
        data={allResults}
        keyExtractor={(item) => `${item._type}-${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CONFIG.COLORS.background },
  searchBar: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: CONFIG.COLORS.card },
  input: {
    flex: 1, backgroundColor: CONFIG.COLORS.background, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 16,
    borderWidth: 1, borderColor: CONFIG.COLORS.border,
  },
  searchBtn: {
    backgroundColor: CONFIG.COLORS.primary, borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  typeRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  typeBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: CONFIG.COLORS.card, borderWidth: 1, borderColor: CONFIG.COLORS.border,
  },
  typeBtnActive: { backgroundColor: CONFIG.COLORS.primary, borderColor: CONFIG.COLORS.primary },
  typeBtnText: { fontSize: 14, color: CONFIG.COLORS.text },
  typeBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  loader: { marginTop: 24 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 48 },
  emptyText: { fontSize: 16, color: CONFIG.COLORS.textSecondary },
  list: { padding: 12 },
  card: {
    backgroundColor: CONFIG.COLORS.card, padding: 12, borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: CONFIG.COLORS.border,
  },
  cardRow: { flexDirection: 'row' },
  thumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: CONFIG.COLORS.text },
  typeBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, backgroundColor: '#EBF5FF', marginTop: 4,
  },
  typeText: { fontSize: 11, color: CONFIG.COLORS.info, fontWeight: '600', textTransform: 'capitalize' },
  cardDesc: { fontSize: 13, color: CONFIG.COLORS.textSecondary, marginTop: 4 },
  cardStatus: { fontSize: 12, color: CONFIG.COLORS.textMuted, marginTop: 4, textTransform: 'capitalize' },
});
