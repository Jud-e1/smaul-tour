'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api';
import AuthShell, { authInputClass, authLabelClass } from '@/components/auth/AuthShell';

export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<{ email: string }>();

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
    <AuthShell
      title="Reset password"
      caption="Explore · Experience · Belong"
      topLink={{ prompt: 'Remembered it?', label: 'Back to log in', href: '/login' }}
    >
      {sent ? (
        <div className="text-center py-6 animate-fade-in">
          <div className="mx-auto w-14 h-14 rounded-full bg-fog flex items-center justify-center text-2xl" aria-hidden>📬</div>
          <h2 className="mt-4 text-[22px] font-semibold">Check your inbox</h2>
          <p className="mt-2 text-ink-muted">
            If an account exists for <span className="font-semibold text-ink">{getValues('email')}</span>, a reset link is on its way.
          </p>
          <Link href="/login" className="btn-primary w-full mt-6">Back to log in</Link>
        </div>
      ) : (
        <>
          <h2 className="text-[22px] font-semibold text-ink">Forgot your password?</h2>
          <p className="mt-1 text-sm text-ink-muted">Enter the email you signed up with and we’ll send you a link to reset it.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className={authLabelClass}>Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email', { required: 'Email is required' })}
                className={authInputClass}
              />
              {errors.email && <p className="mt-1.5 text-xs text-[#C13515]">{errors.email.message}</p>}
            </div>
            {error && (
              <div className="rounded-xl border border-[#C13515]/25 bg-[#FFF8F6] p-3.5 text-sm" role="alert">{error}</div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 text-base">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
