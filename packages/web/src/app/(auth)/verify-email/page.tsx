'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import AuthShell from '@/components/auth/AuthShell';

type Status = 'verifying' | 'success' | 'error' | 'missing';

function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('missing');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => router.push('/login'), 3000);
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        setErrorMsg(
          err?.response?.data?.message || 'Verification failed. The link may have expired.'
        );
        setStatus('error');
      });
  }, [searchParams, router]);

  const states: Record<Status, { icon: string; title: string; body: string; cta?: [string, string] }> = {
    verifying: { icon: '', title: 'Verifying your email…', body: 'This only takes a moment.' },
    success: { icon: '✅', title: 'Email verified', body: 'Your account is active. Taking you to log in…', cta: ['Go to log in', '/login'] },
    error: { icon: '⚠️', title: 'We couldn’t verify that link', body: errorMsg, cta: ['Request a new link', '/reset-password'] },
    missing: { icon: '🔗', title: 'This link looks incomplete', body: 'No verification token found. Open the link from your email again.', cta: ['Back to log in', '/login'] },
  };
  const st = states[status];

  return (
    <AuthShell title="Verify email" caption="Explore · Experience · Belong" topLink={{ prompt: 'Need help?', label: 'Log in', href: '/login' }}>
      <div className="text-center py-6 animate-fade-in" aria-live="polite">
        {status === 'verifying' ? (
          <div className="w-12 h-12 mx-auto rounded-full border-[3px] border-[#EDF2F2] border-t-ink animate-spin" />
        ) : (
          <div className="mx-auto w-14 h-14 rounded-full bg-fog flex items-center justify-center text-2xl" aria-hidden>{st.icon}</div>
        )}
        <h2 className="mt-4 text-[22px] font-semibold">{st.title}</h2>
        <p className="mt-2 text-ink-muted">{st.body}</p>
        {st.cta && <Link href={st.cta[1]} className="btn-primary w-full mt-6">{st.cta[0]}</Link>}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <p className="text-sm text-ink-muted">Verifying your email…</p>
        </div>
      }
    >
      <VerifyEmailPage />
    </Suspense>
  );
}
