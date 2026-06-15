'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/auth';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loginOAuth, isLoading, error, clearError } = useAuthStore();
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

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
      // #region agent log
      fetch('http://127.0.0.1:7530/ingest/996782cf-3a56-4e12-b167-d1376a9b8cab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a4fced' },
        body: JSON.stringify({
          sessionId: 'a4fced',
          hypothesisId: 'H5',
          location: 'login/page.tsx:catch',
          message: 'login ui err',
          data: { storeErrorLen: fromStore?.length ?? 0, usedFallback: !fromStore },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FF385C] to-[#E31C5F] flex-col justify-between p-12 text-white">
        <div>
          <span className="text-2xl font-extrabold tracking-tight">🌍 TourLocal</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-snug mb-4">
            Authentic experiences,
            <br />
            local guides, real memories.
          </h2>
          <p className="text-rose-100 text-sm leading-relaxed max-w-sm">
            Join thousands of travelers discovering hidden gems with the help of AI-powered trip
            planning and verified local guides.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {['AI-powered trip planner', 'Verified local guides', 'Secure escrow payments'].map(
              (f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-rose-100">
                  <svg
                    className="w-4 h-4 text-white shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {f}
                </div>
              )
            )}
          </div>
        </div>
        <p className="text-rose-200 text-xs">© 2026 TourLocal. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <span className="text-2xl font-extrabold text-[#FF385C]">🌍 TourLocal</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-7">Sign in to your account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                {...register('password', { required: 'Password is required' })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {(submitError || error) && (
              <p className="text-red-500 text-sm">{submitError || error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#FF385C] text-white py-2.5 rounded-xl font-medium hover:bg-[#E31C5F] disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400 bg-gray-50 px-2">
              or continue with
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => loginOAuth('google', 'google-oauth-token').catch(() => {})}
              className="flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-2.5 text-sm hover:bg-white transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              onClick={() => loginOAuth('facebook', 'facebook-oauth-token').catch(() => {})}
              className="flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-2.5 text-sm hover:bg-white transition-colors"
            >
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            <Link href="/reset-password" className="text-[#FF385C] hover:underline">
              Forgot password?
            </Link>
            {' · '}
            <Link href="/register" className="text-[#FF385C] hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
