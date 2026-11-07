'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api';

export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>();

  const onSubmit = async ({ email }: { email: string }) => {
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(email);
      setSent(true);
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-black/[0.07] p-8">
        <h1 className="font-display text-2xl font-bold text-ink mb-2">Reset password</h1>
        {sent ? (
          <div className="text-center py-4">
            <svg className="w-12 h-12 text-forest-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-ink/80">Check your email for a reset link.</p>
            <Link href="/login" className="mt-4 inline-block text-forest-600 hover:underline text-sm">Back to login</Link>
          </div>
        ) : (
          <>
            <p className="text-ink-muted text-sm mb-6">Enter your email and we&apos;ll send you a reset link.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1">Email</label>
                <input
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  className="w-full border border-black/[0.12] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-forest-600 text-white py-2.5 rounded-xl font-semibold hover:bg-forest-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm">
              <Link href="/login" className="text-forest-600 hover:underline">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
