'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/auth';
import AuthShell, { authInputClass, authLabelClass } from '@/components/auth/AuthShell';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'traveler' | 'guide';
  agreeToTerms: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, loginOAuth, isLoading, error, clearError } = useAuthStore();
  const [submitError, setSubmitError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: { role: 'traveler' },
  });

  const password = watch('password');
  const selectedRole = watch('role');

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
    <AuthShell
      headline={<>Discover Accra, one<br />guided step at a time.</>}
      caption="Beyond the guidebook"
      image="/auth-explorer.webp"
      imageAlt="Illustrated explorer standing on a green hillside"
      topLink={{ prompt: 'Already a member?', label: 'Sign in', href: '/login' }}
    >
      <h1 className="text-3xl font-extrabold text-accra-green animate-rise-in" style={{ animationDelay: '60ms' }}>
        Create Account
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-3 animate-rise-in" style={{ animationDelay: '120ms' }}>
        <button
          type="button"
          onClick={() => { void loginOAuth('google', 'google-oauth-token').catch(() => {}); }}
          className="flex items-center justify-center gap-2 rounded-xl bg-accra-green text-white text-xs font-semibold py-3 hover:bg-accra-dark hover:-translate-y-0.5 transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign up with Google
        </button>
        <button
          type="button"
          onClick={() => { void loginOAuth('facebook', 'facebook-oauth-token').catch(() => {}); }}
          className="flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 text-accra-green text-xs font-semibold py-3 hover:border-accra-leaf hover:-translate-y-0.5 transition-all"
        >
          <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          with Facebook
        </button>
      </div>

      <p className="mt-5 text-[11px] text-gray-400 animate-rise-in" style={{ animationDelay: '180ms' }}>
        <span className="inline-block w-6 border-t border-gray-200 align-middle mr-2" />
        Or sign up using your email address
      </p>

      <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="mt-4 space-y-3.5">
        <div className="grid grid-cols-2 gap-3 animate-rise-in" style={{ animationDelay: '220ms' }}>
          <div>
            <label className={authLabelClass}>First name</label>
            <input {...register('firstName', { required: 'Required' })} className={authInputClass} />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className={authLabelClass}>Last name</label>
            <input {...register('lastName', { required: 'Required' })} className={authInputClass} />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="animate-rise-in" style={{ animationDelay: '260ms' }}>
          <label className={authLabelClass}>Email</label>
          <input type="email" {...register('email', { required: 'Email is required' })} className={authInputClass} />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div className="animate-rise-in" style={{ animationDelay: '300ms' }}>
          <label className={authLabelClass}>Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
                pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Must include uppercase, lowercase, and number' },
              })}
              className={`${authInputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accra-green transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                {showPassword ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.24A9.1 9.1 0 0112 4c5 0 9 4.5 9 8a9.7 9.7 0 01-2.2 3.9M6.6 6.6C4.3 8 3 10.3 3 12c0 3.5 4 8 9 8 1.4 0 2.7-.3 3.9-.9" />
                ) : (
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </>
                )}
              </svg>
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div className="animate-rise-in" style={{ animationDelay: '340ms' }}>
          <label className={authLabelClass}>Confirm password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (v: string) => v === password || 'Passwords do not match',
            })}
            className={authInputClass}
          />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <div className="animate-rise-in" style={{ animationDelay: '380ms' }}>
          <label className={authLabelClass}>I am a...</label>
          <div className="grid grid-cols-2 gap-3">
            {(['traveler', 'guide'] as const).map((role) => (
              <label
                key={role}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                  selectedRole === role
                    ? 'border-accra-leaf bg-accra-leaf/10 text-accra-green'
                    : 'border-gray-200 text-gray-600 hover:border-accra-leaf/50'
                }`}
              >
                <input type="radio" value={role} {...register('role')} className="accent-accra-leaf" />
                <span className="text-sm font-medium capitalize">{role}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="animate-rise-in" style={{ animationDelay: '420ms' }}>
          <label className="flex items-start gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              {...register('agreeToTerms', { required: 'Please accept the terms to continue' })}
              className="mt-0.5 accent-accra-leaf"
            />
            I agree to all terms and Privacy Policy
          </label>
          {errors.agreeToTerms && <p className="text-red-500 text-xs mt-1">{errors.agreeToTerms.message}</p>}
        </div>

        {(submitError || error) && <p className="text-red-500 text-sm">{submitError || error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-accra-green text-white py-3.5 text-sm font-bold shadow-lg shadow-accra-green/20 hover:bg-accra-dark hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 transition-all animate-rise-in"
          style={{ animationDelay: '460ms' }}
        >
          {isLoading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <p className="mt-5 text-xs text-gray-500 animate-rise-in" style={{ animationDelay: '500ms' }}>
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-accra-leaf hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
