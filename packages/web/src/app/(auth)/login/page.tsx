'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/auth';
import AuthShell, { authInputClass, authLabelClass } from '@/components/auth/AuthShell';
import SocialButtons, { OrDivider } from '@/components/auth/SocialButtons';

interface LoginForm {
  email: string;
  password: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#B3261E]">
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M8 1a7 7 0 110 14A7 7 0 018 1zm0 9.5a1 1 0 100 2 1 1 0 000-2zM8 4a1 1 0 00-1 1v4a1 1 0 002 0V5a1 1 0 00-1-1z" /></svg>
      {message}
    </p>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loginOAuth, isLoading, error, clearError } = useAuthStore();
  const [submitError, setSubmitError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setSubmitError('');
    clearError();
    try {
      await login(data.email, data.password);
      const { user } = useAuthStore.getState();
      if (user?.role === 'guide') router.push('/dashboard/guide');
      else if (user?.role === 'admin') router.push('/admin');
      else router.push('/dashboard/traveler');
    } catch {
      const fromStore = useAuthStore.getState().error;
      setSubmitError(fromStore || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <AuthShell
      title="Log in"
      caption="Explore · Experience · Belong"
      headline="Your star is right where you left it."
      topLink={{ prompt: 'New to Nsoroma?', label: 'Create an account', href: '/register' }}
    >
      <h1 className="text-[44px] leading-[0.95] text-ink">Welcome back.</h1>
      <p className="mt-1 text-sm text-ink-muted">Log in to manage trips, wishlists and your AI itineraries.</p>

      <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className={authLabelClass}>Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email', { required: 'Email is required' })}
            className={authInputClass}
            placeholder="you@example.com"
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className={authLabelClass}>Password</label>
            <Link href="/reset-password" className="text-xs font-semibold underline underline-offset-2">Forgot password?</Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
              className={`${authInputClass} pr-16`}
              placeholder="Your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold underline underline-offset-2 text-ink"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <FieldError message={errors.password?.message} />
        </div>

        {(submitError || error) && (
          <div className="flex gap-3 rounded-xl border border-[#B3261E]/25 bg-[#FBEFEA] p-3.5 text-sm text-ink" role="alert">
            <span className="w-6 h-6 shrink-0 rounded-full bg-[#B3261E] text-white flex items-center justify-center text-xs font-bold">!</span>
            <span>{submitError || error}</span>
          </div>
        )}

        <button type="submit" disabled={isLoading} className="btn-accent w-full !py-3.5 text-base">
          {isLoading ? 'Signing in…' : 'Continue'}
        </button>
      </form>

      <OrDivider />

      <SocialButtons
        onGoogle={() => { void loginOAuth('google', 'google-oauth-token').catch(() => {}); }}
        onFacebook={() => { void loginOAuth('facebook', 'facebook-oauth-token').catch(() => {}); }}
      />
    </AuthShell>
  );
}
