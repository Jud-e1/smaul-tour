'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/auth';
import AuthShell, { authInputClass, authLabelClass } from '@/components/auth/AuthShell';
import SocialButtons, { OrDivider } from '@/components/auth/SocialButtons';
import { Compass, Luggage } from 'lucide-react';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#D70015]">
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M8 1a7 7 0 110 14A7 7 0 018 1zm0 9.5a1 1 0 100 2 1 1 0 000-2zM8 4a1 1 0 00-1 1v4a1 1 0 002 0V5a1 1 0 00-1-1z" /></svg>
      {message}
    </p>
  );
}

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
      title="Sign up"
      caption="Explore · Experience · Belong"
      headline="Share a table, a loom, a drum. Belong."
      topLink={{ prompt: 'Already have an account?', label: 'Log in', href: '/login' }}
    >
      <h1 className="text-[44px] leading-[0.95] text-ink">Join Nsoroma.</h1>
      <p className="mt-1 text-sm text-ink-muted">Create an account to book local experiences or host your own.</p>

      <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="mt-6 space-y-4" noValidate>
        <fieldset>
          <legend className={authLabelClass}>How will you use Nsoroma?</legend>
          <div className="grid grid-cols-2 gap-3">
            {([
              { role: 'traveler', Icon: Luggage, title: 'I’m traveling', desc: 'Book experiences' },
              { role: 'guide', Icon: Compass, title: 'I’m a local guide', desc: 'Host experiences' },
            ] as const).map((opt) => {
              const active = selectedRole === opt.role;
              return (
                <label
                  key={opt.role}
                  className={`relative cursor-pointer rounded-xl border p-4 transition-all ${
                    active ? 'border-ink border-2 p-[15px] bg-fog' : 'border-[#E0E0E5] hover:border-ink'
                  }`}
                >
                  <input type="radio" value={opt.role} {...register('role')} className="sr-only" />
                  <span className="icon-tile w-10 h-10"><opt.Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden /></span>
                  <span className="mt-3 block text-sm font-semibold text-ink">{opt.title}</span>
                  <span className="block text-xs text-ink-muted">{opt.desc}</span>
                  {active && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className={authLabelClass}>First name</label>
            <input id="firstName" autoComplete="given-name" {...register('firstName', { required: 'Required' })} className={authInputClass} />
            <FieldError message={errors.firstName?.message} />
          </div>
          <div>
            <label htmlFor="lastName" className={authLabelClass}>Last name</label>
            <input id="lastName" autoComplete="family-name" {...register('lastName', { required: 'Required' })} className={authInputClass} />
            <FieldError message={errors.lastName?.message} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-ink-muted">Make sure it matches the name on your ID.</p>

        <div>
          <label htmlFor="email" className={authLabelClass}>Email</label>
          <input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email', { required: 'Email is required' })} className={authInputClass} />
          <FieldError message={errors.email?.message} />
        </div>

        <div>
          <label htmlFor="password" className={authLabelClass}>Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
                pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Must include uppercase, lowercase, and number' },
              })}
              className={`${authInputClass} pr-16`}
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
          {errors.password ? (
            <FieldError message={errors.password.message} />
          ) : (
            <p className="mt-1.5 text-xs text-ink-muted">8+ characters with an uppercase letter, a lowercase letter and a number.</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className={authLabelClass}>Confirm password</label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (v: string) => v === password || 'Passwords do not match',
            })}
            className={authInputClass}
          />
          <FieldError message={errors.confirmPassword?.message} />
        </div>

        <div>
          <label className="flex items-start gap-3 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              {...register('agreeToTerms', { required: 'Please accept the terms to continue' })}
              className="mt-0.5 w-5 h-5 rounded border-[#D2D2D7]"
            />
            <span>I agree to Nsoroma’s <span className="font-semibold underline">Terms of Service</span> and <span className="font-semibold underline">Privacy Policy</span>.</span>
          </label>
          <FieldError message={errors.agreeToTerms?.message} />
        </div>

        {(submitError || error) && (
          <div className="flex gap-3 rounded-xl border border-[#D70015]/25 bg-[#FFF0F1] p-3.5 text-sm text-ink" role="alert">
            <span className="w-6 h-6 shrink-0 rounded-full bg-[#D70015] text-white flex items-center justify-center text-xs font-bold">!</span>
            <span>{submitError || error}</span>
          </div>
        )}

        <button type="submit" disabled={isLoading} className="btn-accent w-full !py-3.5 text-base">
          {isLoading ? 'Creating account…' : 'Agree and continue'}
        </button>
      </form>

      <OrDivider />

      <SocialButtons
        onGoogle={() => { void loginOAuth('google', 'google-oauth-token').catch(() => {}); }}
        onFacebook={() => { void loginOAuth('facebook', 'facebook-oauth-token').catch(() => {}); }}
      />

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-2">Log in</Link>
      </p>
    </AuthShell>
  );
}
