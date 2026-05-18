import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { bookingsApi, tripPlannerApi } from '../lib/api';
import { useAuthStore } from '../store/auth';

type Tab = 'bookings' | 'itineraries' | 'profile';
type BookingStatus = 'upcoming' | 'past' | 'cancelled';

interface Booking {
  id: string;
  referenceNumber: string;
  status: string;
  experienceTitle: string;
  date: string;
  participants: number;
  totalAmount: number;
  currency: string;
}

interface Itinerary {
  id: string;
  generatedAt: string;
  totalCost: { amount: number; currency: string };
  parameters: { duration?: number };
}

export default function TravelerDashboardScreen() {
  const { user, logout } = useAuthStore();
  const [tab, setTab] = useState<Tab>('bookings');
  const [bookingFilter, setBookingFilter] = useState<BookingStatus>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (tab === 'bookings') loadBookings();
    else if (tab === 'itineraries') loadItineraries();
  }, [tab, bookingFilter, user]);

  const loadBookings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await bookingsApi.getUserBookings(user.id, { status: bookingFilter });
      setBookings(data.bookings || data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadItineraries = async () => {
    setLoading(true);
    try {
      const { data } = await tripPlannerApi.getItineraries();
      setItineraries(data.itineraries || data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (bookingId: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await bookingsApi.cancel(bookingId, 'Cancelled by traveler');
            setBookings((prev) => prev.filter((b) => b.id !== bookingId));
          } catch {
            Alert.alert('Error', 'Failed to cancel booking');
          }
        },
      },
    ]);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'bookings', label: 'Bookings' },
    { key: 'itineraries', label: 'Itineraries' },
    { key: 'profile', label: 'Profile' },
  ];

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* Bookings Tab */}
        {tab === 'bookings' && (
          <>
            <View style={styles.filterRow}>
              {(['upcoming', 'past', 'cancelled'] as BookingStatus[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterBtn, bookingFilter === f && styles.filterBtnActive]}
                  onPress={() => setBookingFilter(f)}
                >
                  <Text style={[styles.filterBtnText, bookingFilter === f && styles.filterBtnTextActive]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              <ActivityIndicator style={{ padding: 32 }} />
            ) : bookings.length === 0 ? (
              <Text style={styles.emptyText}>No {bookingFilter} bookings</Text>
            ) : (
              bookings.map((b) => (
                <View key={b.id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <Text style={styles.bookingTitle}>{b.experienceTitle}</Text>
                    <View style={[styles.statusBadge, b.status === 'confirmed' ? styles.statusConfirmed : styles.statusOther]}>
                      <Text style={styles.statusText}>{b.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.bookingMeta}>
                    {new Date(b.date).toLocaleDateString()} · {b.participants} participant{b.participants > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.bookingRef}>Ref: {b.referenceNumber}</Text>
                  <View style={styles.bookingFooter}>
                    <Text style={styles.bookingAmount}>{b.currency} {b.totalAmount}</Text>
                    {bookingFilter === 'upcoming' && (
                      <TouchableOpacity onPress={() => handleCancel(b.id)}>
                        <Text style={styles.cancelLink}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Itineraries Tab */}
        {tab === 'itineraries' && (
          <>
            {loading ? (
              <ActivityIndicator style={{ padding: 32 }} />
            ) : itineraries.length === 0 ? (
              <Text style={styles.emptyText}>No saved itineraries</Text>
            ) : (
              itineraries.map((it) => (
                <View key={it.id} style={styles.itineraryCard}>
                  <Text style={styles.itineraryDate}>
                    Generated {new Date(it.generatedAt).toLocaleDateString()}
                  </Text>
                  {it.parameters.duration && (
                    <Text style={styles.itineraryMeta}>{it.parameters.duration} days</Text>
                  )}
                  <Text style={styles.itineraryCost}>
                    {it.totalCost.currency} {it.totalCost.amount?.toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        {/* Profile Tab */}
        {tab === 'profile' && user && (
          <View style={styles.profileSection}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user.profile.firstName.charAt(0)}{user.profile.lastName.charAt(0)}
              </Text>
            </View>
            <Text style={styles.profileName}>{user.profile.firstName} {user.profile.lastName}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#2563EB' },
  tabBtnText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  tabBtnTextActive: { color: '#2563EB', fontWeight: '600' },
  content: { flex: 1 },
  filterRow: { flexDirection: 'row', padding: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#D1D5DB' },
  filterBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterBtnText: { fontSize: 13, color: '#6B7280' },
  filterBtnTextActive: { color: '#fff' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: 48 },
  bookingCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  bookingTitle: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusConfirmed: { backgroundColor: '#D1FAE5' },
  statusOther: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 11, fontWeight: '500', color: '#374151' },
  bookingMeta: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  bookingRef: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  bookingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cancelLink: { fontSize: 13, color: '#DC2626', fontWeight: '500' },
  itineraryCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  itineraryDate: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  itineraryMeta: { fontSize: 13, color: '#374151' },
  itineraryCost: { fontSize: 16, fontWeight: '700', color: '#2563EB', marginTop: 4 },
  profileSection: { padding: 24, alignItems: 'center' },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileAvatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  logoutBtn: { borderWidth: 1, borderColor: '#DC2626', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  logoutBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
});
