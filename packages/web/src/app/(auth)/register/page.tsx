'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/auth';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'traveler' | 'guide';
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const [submitError, setSubmitError] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: { role: 'traveler' },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setSubmitError('');
    clearError();
    try {
      await registerUser({ email: data.email, password: data.password, role: data.role, firstName: data.firstName, lastName: data.lastName });
      const { user } = useAuthStore.getState();
      // #region agent log
      fetch('http://127.0.0.1:7530/ingest/996782cf-3a56-4e12-b167-d1376a9b8cab',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a4fced'},body:JSON.stringify({sessionId:'a4fced',hypothesisId:'H3',location:'register/page.tsx:preRedirect',message:'register redirect',data:{role:user?.role,hasUser:!!user},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (user?.role === 'guide') router.push('/dashboard/guide');
      else if (user?.role === 'admin') router.push('/admin');
      else router.push('/dashboard/traveler');
    } catch {
      const fromStore = useAuthStore.getState().error;
      setSubmitError(fromStore || 'Registration failed. Please try again.');
      // #region agent log
      fetch('http://127.0.0.1:7530/ingest/996782cf-3a56-4e12-b167-d1376a9b8cab',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a4fced'},body:JSON.stringify({sessionId:'a4fced',hypothesisId:'H5',location:'register/page.tsx:catch',message:'register ui err',data:{storeErrorLen:fromStore?.length??0,usedFallback:!fromStore},timestamp:Date.now()})}).catch(()=>{});
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
            Share your city.<br />Earn doing what you love.
          </h2>
          <p className="text-rose-100 text-sm leading-relaxed max-w-sm">
            Whether you're a traveler seeking adventure or a local guide ready to share your passion — there's a place for you here.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {['Free to join', 'Set your own schedule', 'Get paid securely'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-rose-100">
                <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-rose-200 text-xs">© 2026 TourLocal. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <span className="text-2xl font-extrabold text-[#FF385C]">🌍 TourLocal</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
          <p className="text-gray-500 text-sm mb-7">Join the tourism marketplace</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input {...register('firstName', { required: 'Required' })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input {...register('lastName', { required: 'Required' })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" {...register('email', { required: 'Email is required' })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
                pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Must include uppercase, lowercase, and number' },
              })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input type="password" {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (v: string) => v === password || 'Passwords do not match',
              })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]" />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                {(['traveler', 'guide'] as const).map((role) => (
                  <label key={role} className="flex items-center gap-2 border border-gray-300 rounded-xl p-3 cursor-pointer hover:bg-white transition-colors">
                    <input type="radio" value={role} {...register('role')} className="text-[#FF385C]" />
                    <span className="text-sm capitalize">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            {(submitError || error) && <p className="text-red-500 text-sm">{submitError || error}</p>}

            <button type="submit" disabled={isLoading}
              className="w-full bg-[#FF385C] text-white py-2.5 rounded-xl font-medium hover:bg-[#E31C5F] disabled:opacity-50 transition-colors">
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-[#FF385C] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
