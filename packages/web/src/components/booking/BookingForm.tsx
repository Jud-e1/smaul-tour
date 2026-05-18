'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

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

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  // Confirmed state
  if (step === 'confirmed' && confirmed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-green-800">Booking Confirmed!</h3>
        <p className="text-green-700 mt-1">
          Reference: <strong>{confirmed.referenceNumber}</strong>
        </p>
        <p className="text-sm text-green-600 mt-2">
          A confirmation has been sent. Check your dashboard for details.
        </p>
      </div>
    );
  }

  // Payment step
  if (step === 'payment' && booking) {
    return (
      <div className="space-y-4">
        {/* Booking summary */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Booking Summary</h3>
          {selectedSlot && (
            <div className="text-sm text-blue-700 space-y-1">
              <div className="flex justify-between">
                <span>Date</span>
                <span>{new Date(selectedSlot.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Time</span>
                <span>{selectedSlot.startTime} – {selectedSlot.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Participants</span>
                <span>{participants}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-blue-200 pt-1 mt-1">
                <span>Total</span>
                <span>{price.currency} {totalCost.toFixed(2)}</span>
              </div>
            </div>
          )}
          <p className="text-xs text-blue-600 mt-2">Ref: {booking.referenceNumber}</p>
        </div>

        {/* Payment form */}
        <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Payment Details</h3>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cardholder Name</label>
            <input
              type="text"
              placeholder="Name on card"
              {...paymentForm.register('cardholderName', { required: 'Cardholder name is required' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {paymentForm.formState.errors.cardholderName && (
              <p className="text-red-500 text-xs mt-1">{paymentForm.formState.errors.cardholderName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Card Number</label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              inputMode="numeric"
              {...paymentForm.register('cardNumber', {
                required: 'Card number is required',
                validate: (v: string) => v.replace(/\s/g, '').length === 16 || 'Enter a valid 16-digit card number',
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => { e.target.value = formatCardNumber(e.target.value); },
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            {paymentForm.formState.errors.cardNumber && (
              <p className="text-red-500 text-xs mt-1">{paymentForm.formState.errors.cardNumber.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expiry (MM/YY)</label>
              <input
                type="text"
                placeholder="MM/YY"
                inputMode="numeric"
                {...paymentForm.register('expiry', {
                  required: 'Expiry is required',
                  pattern: { value: /^\d{2}\/\d{2}$/, message: 'Use MM/YY format' },
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => { e.target.value = formatExpiry(e.target.value); },
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              {paymentForm.formState.errors.expiry && (
                <p className="text-red-500 text-xs mt-1">{paymentForm.formState.errors.expiry.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CVC</label>
              <input
                type="text"
                placeholder="123"
                inputMode="numeric"
                maxLength={4}
                {...paymentForm.register('cvc', {
                  required: 'CVC is required',
                  pattern: { value: /^\d{3,4}$/, message: 'Enter 3 or 4 digits' },
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              {paymentForm.formState.errors.cvc && (
                <p className="text-red-500 text-xs mt-1">{paymentForm.formState.errors.cvc.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Payments are processed securely
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setStep('select'); setError(''); }}
              disabled={loading}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loading ? 'Processing...' : `Pay ${price.currency} ${totalCost.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 1: Slot selection
  return (
    <form onSubmit={bookingForm.handleSubmit(handleBookingSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Date &amp; Time</label>
        {availableSlots.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-sm text-gray-500">No available slots at this time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
            {availableSlots.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              const spotsLeft = slot.capacity - slot.booked;
              return (
                <label
                  key={slot.id}
                  className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
                      : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    value={slot.id}
                    {...bookingForm.register('slotId', { required: 'Please select a date and time' })}
                    className="sr-only"
                  />
                  <div>
                    <p className={`text-sm font-medium ${isSelected ? 'text-teal-800' : 'text-gray-800'}`}>
                      {new Date(slot.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className={`text-xs mt-0.5 ${isSelected ? 'text-teal-600' : 'text-gray-500'}`}>
                      {slot.startTime} – {slot.endTime}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    spotsLeft <= 2 ? 'bg-amber-100 text-amber-700' : isSelected ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {bookingForm.formState.errors.slotId && (
          <p className="text-red-500 text-xs mt-1">{bookingForm.formState.errors.slotId.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Participants</label>
        <input
          type="number"
          min={1}
          max={selectedSlot ? selectedSlot.capacity - selectedSlot.booked : 10}
          {...bookingForm.register('participants', { required: true, min: 1, valueAsNumber: true })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {selectedSlot && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Price per person</span>
            <span>{price.currency} {price.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600 mt-1">
            <span>Participants</span>
            <span>× {participants}</span>
          </div>
          <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{price.currency} {totalCost.toFixed(2)}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || availableSlots.length === 0}
        className="w-full bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Checking availability...' : 'Continue to Payment'}
      </button>

      {!user && (
        <p className="text-xs text-center text-gray-500">
          You&apos;ll need to{' '}
          <a href="/login" className="text-blue-600 hover:underline">log in</a>
          {' '}to complete your booking.
        </p>
      )}
    </form>
  );
}
