import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { experiencesApi } from '../lib/api';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Experiences'> };

interface Experience {
  id: string;
  title: string;
  description: string;
  price: { amount: number; currency: string };
  duration: number;
  averageRating: number;
  reviewCount: number;
  primaryImage?: { thumbnailUrl: string };
  location: { address: string };
}

const SORT_OPTIONS = ['rating', 'price_asc', 'price_desc', 'popularity'];

export default function ExperiencesScreen({ navigation }: Props) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('rating');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchExperiences = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const { data } = await experiencesApi.list({
        search: search || undefined,
        sort,
        page: currentPage,
        limit: 10,
      });
      const items: Experience[] = data.experiences || data;
      if (reset) {
        setExperiences(items);
        setPage(2);
      } else {
        setExperiences((prev) => [...prev, ...items]);
        setPage((p) => p + 1);
      }
      setHasMore(items.length === 10);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, sort, page, loading]);

  useEffect(() => {
    fetchExperiences(true);
  }, [search, sort]);

  const renderItem = ({ item }: { item: Experience }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ExperienceDetail', { id: item.id })}
    >
      {item.primaryImage?.thumbnailUrl ? (
        <Image source={{ uri: item.primaryImage.thumbnailUrl }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Text style={styles.placeholderText}>🗺️</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardLocation} numberOfLines={1}>{item.location.address}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardRating}>⭐ {item.averageRating?.toFixed(1) || 'New'}</Text>
          <Text style={styles.cardDuration}>{item.duration}h</Text>
          <Text style={styles.cardPrice}>
            {item.price.currency} {item.price.amount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search experiences..."
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Sort */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sortBtn, sort === s && styles.sortBtnActive]}
            onPress={() => setSort(s)}
          >
            <Text style={[styles.sortBtnText, sort === s && styles.sortBtnTextActive]}>
              {s.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={experiences}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={() => hasMore && fetchExperiences()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 16 }} /> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No experiences found</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchRow: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchInput: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10,
    fontSize: 15, backgroundColor: '#F9FAFB',
  },
  sortRow: { flexDirection: 'row', padding: 8, backgroundColor: '#fff', gap: 6, flexWrap: 'wrap' },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: '#D1D5DB' },
  sortBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  sortBtnText: { fontSize: 12, color: '#6B7280' },
  sortBtnTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10,
    borderRadius: 10, overflow: 'hidden', elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  cardImage: { width: 90, height: 90 },
  cardImagePlaceholder: { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 28 },
  cardContent: { flex: 1, padding: 10, justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardLocation: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  cardMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cardRating: { fontSize: 12, color: '#374151' },
  cardDuration: { fontSize: 12, color: '#6B7280' },
  cardPrice: { fontSize: 12, fontWeight: '600', color: '#2563EB', marginLeft: 'auto' },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
