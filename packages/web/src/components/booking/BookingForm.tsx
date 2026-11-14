'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { AlertCircle } from 'lucide-react';

export interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  status: 'available' | 'booked' | 'blocked';
}

export interface BookingFormProps {
  experienceId: string;
  price: { amount: number; currency: string };
  slots: AvailabilitySlot[];
  onSuccess?: (booking: { referenceNumber: string; id: string }) => void;
}

interface BookingFormValues {
  slotId: string;
  participants: number;
}

interface PaymentFormValues {
  cardNumber: string;
  expiry: string;
  cvc: string;
  cardholderName: string;
}

type Step = 'select' | 'payment' | 'confirmed';

interface BookingResult {
  id: string;
  referenceNumber: string;
}

export default function BookingForm({ experienceId, price, slots, onSuccess }: BookingFormProps) {
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>('select');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [confirmed, setConfirmed] = useState<BookingResult | null>(null);

  const bookingForm = useForm<BookingFormValues>({ defaultValues: { participants: 1 } });
  const paymentForm = useForm<PaymentFormValues>();

  const selectedSlotId = bookingForm.watch('slotId');
  const participants = bookingForm.watch('participants');
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const totalCost = selectedSlot ? price.amount * participants : 0;

  const availableSlots = slots.filter((s) => s.status === 'available' && s.booked < s.capacity);

  // Step 1: Create booking
  const handleBookingSubmit = async (values: BookingFormValues) => {
    if (!user) { setError('Please log in to book.'); return; }
    const slot = slots.find((s) => s.id === values.slotId);
    if (!slot) { setError('Please select a date and time.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await bookingsApi.create({
        experienceId,
        date: slot.date,
        startTime: slot.startTime,
        participants: values.participants,
      });
      setBooking({ id: data.id, referenceNumber: data.referenceNumber });
      setStep('payment');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'The selected time may no longer be available. Please choose another slot.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Process payment
  const handlePaymentSubmit = async (_values: PaymentFormValues) => {
    if (!booking) return;
    setLoading(true);
    setError('');
    try {
      await paymentsApi.process({
        bookingId: booking.id,
        amount: { amount: totalCost, currency: price.currency },
        paymentMethodId: 'card_simulated',
        returnUrl: typeof window !== 'undefined' ? window.location.href : '',
      });
      setConfirmed(booking);
      setStep('confirmed');
      onSuccess?.(booking);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Payment failed. Please check your card details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) =>
    value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const money = (n: number) => `${price.currency === 'USD' ? '$' : `${price.currency} `}${n.toFixed(n % 1 ? 2 : 0)}`;
  const maxGuests = selectedSlot ? selectedSlot.capacity - selectedSlot.booked : 10;
  const setGuests = (n: number) =>
    bookingForm.setValue('participants', Math.max(1, Math.min(maxGuests, n)), { shouldValidate: true });

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  // Confirmed state
  if (step === 'confirmed' && confirmed) {
    return (
      <div className="text-center py-4 animate-scale-in">
        <div className="mx-auto w-14 h-14 rounded-full bg-leaf flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-4 text-[22px] font-semibold text-ink">You’re booked!</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Confirmation code <span className="font-semibold text-ink">{confirmed.referenceNumber}</span>
        </p>
        <p className="mt-3 text-sm text-ink-muted">We’ve sent the details to your email. You’ll find this trip in your dashboard.</p>
        <a href="/dashboard/traveler?tab=bookings" className="btn-primary w-full mt-5">View my trips</a>
      </div>
    );
  }

  // Payment step
  if (step === 'payment' && booking) {
    const inputBase = 'w-full bg-transparent px-3 pt-6 pb-2 text-[15px] text-ink outline-none font-medium placeholder:text-ink-soft';
    const err = paymentForm.formState.errors;
    const errs = [err.cardholderName, err.cardNumber, err.expiry, err.cvc].filter(Boolean);
    return (
      <div className="space-y-5 animate-fade-in">
        <button
          type="button"
          onClick={() => { setStep('select'); setError(''); }}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2 disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Change date or guests
        </button>

        {selectedSlot && (
          <div className="rounded-xl border border-[#E1D8CA] divide-y divide-[#E1D8CA] text-sm">
            <div className="px-4 py-3">
              <p className="font-semibold">Date</p>
              <p className="text-ink-muted">
                {new Date(selectedSlot.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}{selectedSlot.startTime} – {selectedSlot.endTime}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="font-semibold">Guests</p>
              <p className="text-ink-muted">{participants} guest{participants === 1 ? '' : 's'}</p>
            </div>
            <div className="px-4 py-3 flex justify-between font-semibold">
              <span>Total ({price.currency})</span>
              <span>{money(totalCost)}</span>
            </div>
          </div>
        )}

        <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink">Pay with card</h3>
            <span className="flex gap-1" aria-hidden>
              {['VISA', 'MC', 'MoMo'].map((b) => (
                <span key={b} className="px-1.5 py-0.5 rounded border border-[#E1D8CA] text-[9px] font-bold text-ink-muted">{b}</span>
              ))}
            </span>
          </div>

          {/* Airbnb-style grouped card inputs */}
          <div className="rounded-xl border border-[#C9BCA9] overflow-hidden focus-within:border-ink">
            <label className="relative block border-b border-[#C9BCA9]">
              <span className="absolute left-3 top-2 text-xs text-ink-muted">Cardholder name</span>
              <input
                type="text"
                placeholder="Name on card"
                autoComplete="cc-name"
                {...paymentForm.register('cardholderName', { required: 'Cardholder name is required' })}
                className={inputBase}
              />
            </label>
            <label className="relative block border-b border-[#C9BCA9]">
              <span className="absolute left-3 top-2 text-xs text-ink-muted">Card number</span>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                autoComplete="cc-number"
                {...paymentForm.register('cardNumber', {
                  required: 'Card number is required',
                  validate: (v: string) => v.replace(/\s/g, '').length === 16 || 'Enter a valid 16-digit card number',
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => { e.target.value = formatCardNumber(e.target.value); },
                })}
                className={`${inputBase} tracking-wider`}
              />
            </label>
            <div className="grid grid-cols-2 divide-x divide-[#C9BCA9]">
              <label className="relative block">
                <span className="absolute left-3 top-2 text-xs text-ink-muted">Expiration</span>
                <input
                  type="text"
                  placeholder="MM/YY"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  {...paymentForm.register('expiry', {
                    required: 'Expiry is required',
                    pattern: { value: /^\d{2}\/\d{2}$/, message: 'Use MM/YY format' },
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => { e.target.value = formatExpiry(e.target.value); },
                  })}
                  className={inputBase}
                />
              </label>
              <label className="relative block">
                <span className="absolute left-3 top-2 text-xs text-ink-muted">CVC</span>
                <input
                  type="text"
                  placeholder="123"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="cc-csc"
                  {...paymentForm.register('cvc', {
                    required: 'CVC is required',
                    pattern: { value: /^\d{3,4}$/, message: 'Enter 3 or 4 digits' },
                  })}
                  className={inputBase}
                />
              </label>
            </div>
          </div>
          {errs.length > 0 && (
            <ul className="space-y-1">
              {errs.map((e) => (
                <li key={e?.message} className="flex items-center gap-1.5 text-xs text-[#B3261E]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />{e?.message}
                </li>
              ))}
            </ul>
          )}

          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <svg className="w-3.5 h-3.5 text-leaf" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Held in escrow until your experience happens · Ref {booking.referenceNumber}
          </p>

          {error && (
            <div className="flex gap-2 rounded-xl border border-[#B3261E]/30 bg-[#FBEFEA] p-3 text-sm text-[#B3261E]" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />{error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-accent w-full !py-3.5 text-base">
            {loading ? 'Processing…' : `Confirm and pay ${money(totalCost)}`}
          </button>
        </form>
      </div>
    );
  }

  // Step 1: Slot selection
  const guests = participants || 1;
  return (
    <form onSubmit={bookingForm.handleSubmit(handleBookingSubmit)} className="space-y-4">
      <div className="rounded-xl border border-[#C9BCA9] overflow-hidden">
        <p className="px-3 pt-2.5 pb-2 text-[10px] font-bold uppercase tracking-[0.04em] text-ink">Date &amp; time</p>
        {availableSlots.length === 0 ? (
          <p className="px-3 pb-4 text-sm text-ink-muted">No open dates right now — check back soon.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto px-2 pb-2 space-y-1">
            {availableSlots.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              const spotsLeft = slot.capacity - slot.booked;
              return (
                <label
                  key={slot.id}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-ink bg-fog' : 'hover:bg-fog'
                  }`}
                >
                  <input
                    type="radio"
                    value={slot.id}
                    {...bookingForm.register('slotId', { required: 'Please select a date and time' })}
                    className="sr-only"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      {new Date(slot.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="block text-xs text-ink-muted">{slot.startTime} – {slot.endTime}</span>
                  </span>
                  <span className={`text-xs font-medium ${spotsLeft <= 2 ? 'text-[#B3261E]' : 'text-ink-muted'}`}>
                    {spotsLeft <= 2 ? `Only ${spotsLeft} left` : `${spotsLeft} spots`}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        <div className="border-t border-[#C9BCA9] px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-ink">Guests</p>
            <p className="text-sm text-ink">{guests} guest{guests === 1 ? '' : 's'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setGuests(guests - 1)}
              disabled={guests <= 1}
              aria-label="Fewer guests"
              className="w-8 h-8 rounded-full border border-[#C9BCA9] text-ink-muted hover:border-ink hover:text-ink disabled:opacity-30 disabled:hover:border-[#C9BCA9] flex items-center justify-center"
            >−</button>
            <input
              type="number"
              min={1}
              max={maxGuests}
              aria-label="Participants"
              {...bookingForm.register('participants', { required: true, min: 1, valueAsNumber: true })}
              className="w-8 text-center text-sm font-medium bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setGuests(guests + 1)}
              disabled={guests >= maxGuests}
              aria-label="More guests"
              className="w-8 h-8 rounded-full border border-[#C9BCA9] text-ink-muted hover:border-ink hover:text-ink disabled:opacity-30 disabled:hover:border-[#C9BCA9] flex items-center justify-center"
            >+</button>
          </div>
        </div>
      </div>
      {bookingForm.formState.errors.slotId && (
        <p className="flex items-center gap-1.5 text-xs text-[#B3261E]"><AlertCircle className="w-3.5 h-3.5" aria-hidden />{bookingForm.formState.errors.slotId.message}</p>
      )}

      {error && (
        <div className="flex gap-2 rounded-xl border border-[#B3261E]/30 bg-[#FBEFEA] p-3 text-sm text-[#B3261E]" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />{error}
        </div>
      )}

      <button type="submit" disabled={loading || availableSlots.length === 0} className="btn-accent w-full !py-3.5 text-base">
        {loading ? 'Checking availability…' : 'Reserve'}
      </button>
      <p className="text-center text-sm text-ink-muted">You won’t be charged yet</p>

      {selectedSlot && (
        <div className="space-y-3 text-[15px] animate-fade-in">
          <div className="flex justify-between text-ink">
            <span className="underline underline-offset-2">{money(price.amount)} × {guests} guest{guests === 1 ? '' : 's'}</span>
            <span>{money(totalCost)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-4 border-t border-[#E1D8CA]">
            <span>Total</span>
            <span>{money(totalCost)}</span>
          </div>
        </div>
      )}

      {!user && (
        <p className="text-sm text-center text-ink-muted">
          You’ll need to{' '}
          <a href="/login" className="font-semibold text-ink underline underline-offset-2">log in</a>
          {' '}to complete your booking.
        </p>
      )}
    </form>
  );
}
