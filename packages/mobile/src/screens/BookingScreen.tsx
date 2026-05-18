import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { experiencesApi, bookingsApi } from '../lib/api';
import { useAuthStore } from '../store/auth';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Booking'>;
  route: RouteProp<RootStackParamList, 'Booking'>;
};

interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableCapacity: number;
  price: { amount: number; currency: string };
}

type Step = 'select' | 'payment' | 'confirmed';

export default function BookingScreen({ navigation, route }: Props) {
  const { experienceId } = route.params;
  const { user } = useAuthStore();
  const [experience, setExperience] = useState<{ title: string; price: { amount: number; currency: string } } | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [participants, setParticipants] = useState(1);
  const [step, setStep] = useState<Step>('select');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<{ referenceNumber: string; id: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    experiencesApi
      .get(experienceId)
      .then(({ data }) => {
        setExperience(data);
        setSlots(data.availabilitySlots || []);
      })
      .catch(() => navigation.goBack())
      .finally(() => setLoading(false));
  }, [experienceId, navigation]);

  const handleProceedToPayment = () => {
    if (!selectedSlot) {
      Alert.alert('Error', 'Please select a date and time');
      return;
    }
    setStep('payment');
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !user) return;
    setProcessing(true);
    try {
      // In production, collect real payment method via Stripe SDK
      const { data } = await bookingsApi.create({
        experienceId,
        slotId: selectedSlot.id,
        participants,
        paymentMethodId: 'pm_test_placeholder',
      });
      setBooking(data);
      setStep('confirmed');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Booking failed';
      Alert.alert('Error', msg);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (step === 'confirmed' && booking) {
    return (
      <View style={styles.confirmedContainer}>
        <Text style={styles.confirmedIcon}>✅</Text>
        <Text style={styles.confirmedTitle}>Booking Confirmed!</Text>
        <Text style={styles.confirmedRef}>Reference: {booking.referenceNumber}</Text>
        <Text style={styles.confirmedSub}>
          A confirmation has been sent to your email. You can view your booking in the dashboard.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('TravelerDashboard')}
        >
          <Text style={styles.primaryBtnText}>View My Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Experiences')}
        >
          <Text style={styles.secondaryBtnText}>Browse More Experiences</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalCost = selectedSlot
    ? selectedSlot.price.amount * participants
    : (experience?.price.amount || 0) * participants;
  const currency = selectedSlot?.price.currency || experience?.price.currency || 'USD';

  return (
    <ScrollView style={styles.container}>
      {/* Step indicator */}
      <View style={styles.steps}>
        {(['select', 'payment'] as Step[]).map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepCircle, step === s && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, step === s && styles.stepNumActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>
              {s === 'select' ? 'Select Date' : 'Payment'}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.content}>
        {step === 'select' && (
          <>
            <Text style={styles.sectionTitle}>Select Date & Time</Text>
            {slots.length === 0 ? (
              <Text style={styles.noSlots}>No available dates. Check back later.</Text>
            ) : (
              slots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.slotCard, selectedSlot?.id === slot.id && styles.slotCardSelected]}
                  onPress={() => setSelectedSlot(slot)}
                  disabled={slot.availableCapacity === 0}
                >
                  <View style={styles.slotInfo}>
                    <Text style={styles.slotDate}>
                      {new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={styles.slotTime}>{slot.startTime} – {slot.endTime}</Text>
                    <Text style={styles.slotCapacity}>
                      {slot.availableCapacity > 0 ? `${slot.availableCapacity} spots left` : 'Full'}
                    </Text>
                  </View>
                  <Text style={styles.slotPrice}>{slot.price.currency} {slot.price.amount}</Text>
                </TouchableOpacity>
              ))
            )}

            {/* Participants */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Participants</Text>
            <View style={styles.participantsRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setParticipants((p) => Math.max(1, p - 1))}
              >
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.participantsCount}>{participants}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setParticipants((p) => p + 1)}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>{currency} {totalCost}</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleProceedToPayment}>
              <Text style={styles.primaryBtnText}>Continue to Payment</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'payment' && (
          <>
            <Text style={styles.sectionTitle}>Payment</Text>

            {/* Booking summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>{experience?.title}</Text>
              {selectedSlot && (
                <Text style={styles.summaryCardMeta}>
                  {new Date(selectedSlot.date).toLocaleDateString()} · {selectedSlot.startTime}
                </Text>
              )}
              <Text style={styles.summaryCardMeta}>{participants} participant{participants > 1 ? 's' : ''}</Text>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryValue}>{currency} {totalCost}</Text>
              </View>
            </View>

            {/* Payment note */}
            <View style={styles.paymentNote}>
              <Text style={styles.paymentNoteText}>
                💳 In production, Apple Pay and Google Pay would be available here via Stripe SDK.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleConfirmBooking}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Confirm & Pay {currency} {totalCost}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('select')}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 32, padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: '#2563EB' },
  stepNum: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 11, color: '#9CA3AF' },
  stepLabelActive: { color: '#2563EB', fontWeight: '600' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  noSlots: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: 24 },
  slotCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  slotCardSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  slotInfo: { flex: 1 },
  slotDate: { fontSize: 14, fontWeight: '600', color: '#111827' },
  slotTime: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  slotCapacity: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  slotPrice: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  participantsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  counterBtnText: { fontSize: 20, color: '#374151', fontWeight: '600' },
  participantsCount: { fontSize: 18, fontWeight: '700', color: '#111827', minWidth: 24, textAlign: 'center' },
  summaryBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#EFF6FF', borderRadius: 8, padding: 12, marginBottom: 16 },
  summaryLabel: { fontSize: 14, color: '#374151' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#1E40AF' },
  primaryBtn: { backgroundColor: '#2563EB', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, alignItems: 'center' },
  secondaryBtnText: { color: '#374151', fontSize: 15 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  summaryCardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  summaryCardMeta: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  summaryDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  paymentNote: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 12, marginBottom: 16 },
  paymentNoteText: { fontSize: 13, color: '#92400E' },
  backBtn: { alignItems: 'center', padding: 8 },
  backBtnText: { color: '#6B7280', fontSize: 14 },
  confirmedContainer: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  confirmedIcon: { fontSize: 64, marginBottom: 16 },
  confirmedTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  confirmedRef: { fontSize: 16, color: '#2563EB', fontWeight: '600', marginBottom: 12 },
  confirmedSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
});
