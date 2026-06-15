import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { experiencesApi } from '../lib/api';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'ExperienceDetail'>;
  route: RouteProp<RootStackParamList, 'ExperienceDetail'>;
};

const { width } = Dimensions.get('window');

interface Experience {
  id: string;
  title: string;
  description: string;
  price: { amount: number; currency: string };
  duration: number;
  averageRating: number;
  reviewCount: number;
  images: { id: string; mediumUrl: string; isPrimary: boolean }[];
  location: { address: string; latitude: number; longitude: number };
  guide: {
    id: string;
    profile: { firstName: string; lastName: string; bio?: string; profilePhotoUrl?: string };
    verificationStatus?: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer: { profile: { firstName: string; lastName: string } };
}

interface Recommendation {
  id: string;
  title: string;
  price: { amount: number; currency: string };
  averageRating: number;
  primaryImage?: { thumbnailUrl: string };
}

export default function ExperienceDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [experience, setExperience] = useState<Experience | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    Promise.all([
      experiencesApi.get(id),
      experiencesApi.getReviews(id, { limit: 5 }),
      experiencesApi.getRecommendations(id),
    ])
      .then(([expRes, reviewsRes, recsRes]) => {
        setExperience(expRes.data);
        setReviews(reviewsRes.data.reviews || reviewsRes.data);
        setRecommendations(recsRes.data.experiences || recsRes.data);
      })
      .catch(() => navigation.goBack())
      .finally(() => setLoading(false));
  }, [id, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!experience) return null;

  const images = experience.images?.length ? experience.images : [];

  return (
    <ScrollView style={styles.container}>
      {/* Image Gallery */}
      {images.length > 0 ? (
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
          >
            {images.map((img) => (
              <Image key={img.id} source={{ uri: img.mediumUrl }} style={styles.heroImage} />
            ))}
          </ScrollView>
          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.heroImage, styles.heroPlaceholder]}>
          <Text style={{ fontSize: 48 }}>🗺️</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Title & Price */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{experience.title}</Text>
          <Text style={styles.price}>
            {experience.price.currency} {experience.price.amount}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            ⭐ {experience.averageRating?.toFixed(1) || 'New'} ({experience.reviewCount})
          </Text>
          <Text style={styles.meta}>⏱ {experience.duration}h</Text>
          <Text style={styles.meta}>📍 {experience.location.address}</Text>
        </View>

        <Text style={styles.description}>{experience.description}</Text>

        {/* Guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Guide</Text>
          <View style={styles.guideRow}>
            {experience.guide.profile.profilePhotoUrl ? (
              <Image
                source={{ uri: experience.guide.profile.profilePhotoUrl }}
                style={styles.guideAvatar}
              />
            ) : (
              <View style={[styles.guideAvatar, styles.guideAvatarPlaceholder]}>
                <Text style={{ fontSize: 20 }}>👤</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.guideNameRow}>
                <Text style={styles.guideName}>
                  {experience.guide.profile.firstName} {experience.guide.profile.lastName}
                </Text>
                {experience.guide.verificationStatus === 'approved' && (
                  <Text style={styles.verifiedBadge}>✓ Verified</Text>
                )}
              </View>
              {experience.guide.profile.bio && (
                <Text style={styles.guideBio} numberOfLines={2}>
                  {experience.guide.profile.bio}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Book Button */}
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('Booking', { experienceId: id })}
        >
          <Text style={styles.bookBtnText}>Book Now</Text>
        </TouchableOpacity>

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>
                    {r.reviewer.profile.firstName} {r.reviewer.profile.lastName}
                  </Text>
                  <Text style={styles.reviewRating}>{'⭐'.repeat(r.rating)}</Text>
                </View>
                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                <Text style={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Similar Experiences</Text>
            <FlatList
              horizontal
              data={recommendations}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recCard}
                  onPress={() => navigation.push('ExperienceDetail', { id: item.id })}
                >
                  {item.primaryImage?.thumbnailUrl ? (
                    <Image
                      source={{ uri: item.primaryImage.thumbnailUrl }}
                      style={styles.recImage}
                    />
                  ) : (
                    <View style={[styles.recImage, styles.recImagePlaceholder]}>
                      <Text>🗺️</Text>
                    </View>
                  )}
                  <Text style={styles.recTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.recPrice}>
                    {item.price.currency} {item.price.amount}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroImage: { width, height: 240 },
  heroPlaceholder: { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  imageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginTop: -20,
    paddingBottom: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff' },
  content: { padding: 16 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  price: { fontSize: 18, fontWeight: '700', color: '#2563EB' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  meta: { fontSize: 13, color: '#6B7280' },
  description: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  guideRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  guideAvatar: { width: 48, height: 48, borderRadius: 24 },
  guideAvatarPlaceholder: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guideName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  verifiedBadge: {
    fontSize: 11,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  guideBio: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  bookBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  reviewCard: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 8 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewAuthor: { fontSize: 13, fontWeight: '600', color: '#374151' },
  reviewRating: { fontSize: 12 },
  reviewComment: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  reviewDate: { fontSize: 11, color: '#9CA3AF' },
  recCard: { width: 140, marginRight: 12 },
  recImage: { width: 140, height: 90, borderRadius: 8, marginBottom: 6 },
  recImagePlaceholder: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTitle: { fontSize: 13, fontWeight: '500', color: '#111827' },
  recPrice: { fontSize: 12, color: '#2563EB', fontWeight: '600', marginTop: 2 },
});
