import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { experiencesApi, bookingsApi } from '../lib/api';
import { useAuthStore } from '../store/auth';

type Tab = 'experiences' | 'bookings' | 'reviews' | 'profile';

interface Experience {
  id: string;
  title: string;
  status: string;
  price: { amount: number; currency: string };
  averageRating: number;
  reviewCount: number;
}

interface Booking {
  id: string;
  referenceNumber: string;
  status: string;
  travelerName: string;
  date: string;
  participants: number;
  totalAmount: number;
  currency: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  experienceTitle: string;
  reviewerName: string;
}

export default function GuideDashboardScreen() {
  const { user, logout } = useAuthStore();
  const [tab, setTab] = useState<Tab>('experiences');
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadTab(tab);
  }, [tab, user]);

  const loadTab = async (t: Tab) => {
    if (!user) return;
    setLoading(true);
    try {
      if (t === 'experiences') {
        const { data } = await experiencesApi.list({ guideId: user.id });
        setExperiences(data.experiences || data);
      } else if (t === 'bookings') {
        const { data } = await bookingsApi.getUserBookings(user.id, { role: 'guide' });
        setBookings(data.bookings || data);
      } else if (t === 'reviews') {
        // Reviews loaded per experience — simplified here
        const { data } = await experiencesApi.list({ guideId: user.id });
        const exps = data.experiences || data;
        const allReviews: Review[] = [];
        for (const exp of exps.slice(0, 3)) {
          const { data: revData } = await experiencesApi.getReviews(exp.id, { limit: 5 });
          const revs = revData.reviews || revData;
          allReviews.push(...revs.map((r: Review) => ({ ...r, experienceTitle: exp.title })));
        }
        setReviews(allReviews);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'experiences', label: 'Experiences' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'profile', label: 'Profile' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator style={{ padding: 32 }} />
        ) : (
          <>
            {tab === 'experiences' && (
              <>
                {experiences.length === 0 ? (
                  <Text style={styles.emptyText}>No experiences yet</Text>
                ) : (
                  experiences.map((exp) => (
                    <View key={exp.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{exp.title}</Text>
                        <View
                          style={[
                            styles.badge,
                            exp.status === 'approved' ? styles.badgeGreen : styles.badgeGray,
                          ]}
                        >
                          <Text style={styles.badgeText}>{exp.status}</Text>
                        </View>
                      </View>
                      <View style={styles.cardMeta}>
                        <Text style={styles.metaText}>
                          {exp.price.currency} {exp.price.amount}
                        </Text>
                        <Text style={styles.metaText}>
                          ⭐ {exp.averageRating?.toFixed(1) || 'New'} ({exp.reviewCount})
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {tab === 'bookings' && (
              <>
                {bookings.length === 0 ? (
                  <Text style={styles.emptyText}>No bookings yet</Text>
                ) : (
                  bookings.map((b) => (
                    <View key={b.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{b.travelerName}</Text>
                        <View
                          style={[
                            styles.badge,
                            b.status === 'confirmed' ? styles.badgeGreen : styles.badgeGray,
                          ]}
                        >
                          <Text style={styles.badgeText}>{b.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.metaText}>
                        {new Date(b.date).toLocaleDateString()} · {b.participants} participant
                        {b.participants > 1 ? 's' : ''}
                      </Text>
                      <View style={styles.cardFooter}>
                        <Text style={styles.refText}>Ref: {b.referenceNumber}</Text>
                        <Text style={styles.amountText}>
                          {b.currency} {b.totalAmount}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {tab === 'reviews' && (
              <>
                {reviews.length === 0 ? (
                  <Text style={styles.emptyText}>No reviews yet</Text>
                ) : (
                  reviews.map((r) => (
                    <View key={r.id} style={styles.card}>
                      <Text style={styles.reviewExp}>{r.experienceTitle}</Text>
                      <View style={styles.reviewHeader}>
                        <Text style={styles.reviewAuthor}>{r.reviewerName}</Text>
                        <Text>{'⭐'.repeat(r.rating)}</Text>
                      </View>
                      {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                      <Text style={styles.reviewDate}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  ))
                )}
              </>
            )}

            {tab === 'profile' && user && (
              <View style={styles.profileSection}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {user.profile.firstName.charAt(0)}
                    {user.profile.lastName.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.profileName}>
                  {user.profile.firstName} {user.profile.lastName}
                </Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                {user.profile.guideVerificationStatus && (
                  <View
                    style={[
                      styles.badge,
                      user.profile.guideVerificationStatus === 'approved'
                        ? styles.badgeGreen
                        : styles.badgeGray,
                      { marginBottom: 16 },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {user.profile.guideVerificationStatus === 'approved'
                        ? '✓ Verified Guide'
                        : user.profile.guideVerificationStatus}
                    </Text>
                  </View>
                )}
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                  <Text style={styles.logoutBtnText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#2563EB' },
  tabBtnText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  tabBtnTextActive: { color: '#2563EB', fontWeight: '600' },
  content: { flex: 1 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: 48 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeGreen: { backgroundColor: '#D1FAE5' },
  badgeGray: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 11, fontWeight: '500', color: '#374151' },
  cardMeta: { flexDirection: 'row', gap: 12 },
  metaText: { fontSize: 13, color: '#6B7280' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  refText: { fontSize: 12, color: '#9CA3AF' },
  amountText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  reviewExp: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewAuthor: { fontSize: 13, fontWeight: '600', color: '#374151' },
  reviewComment: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  reviewDate: { fontSize: 11, color: '#9CA3AF' },
  profileSection: { padding: 24, alignItems: 'center' },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  logoutBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
});
