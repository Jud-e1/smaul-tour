'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

type Status = 'verifying' | 'success' | 'error' | 'missing';

export default function VerifyEmailPage() {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Verifying your email...</h1>
            <p className="text-gray-500 text-sm mt-2">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <svg
              className="w-12 h-12 text-green-500 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h1 className="text-xl font-bold text-gray-900">Email verified!</h1>
            <p className="text-gray-500 text-sm mt-2">
              Your account is now active. Redirecting to login...
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-blue-600 hover:underline text-sm"
            >
              Go to login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <svg
              className="w-12 h-12 text-red-500 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h1 className="text-xl font-bold text-gray-900">Verification failed</h1>
            <p className="text-gray-500 text-sm mt-2">{errorMsg}</p>
            <Link
              href="/reset-password"
              className="mt-4 inline-block text-blue-600 hover:underline text-sm"
            >
              Request a new link
            </Link>
          </>
        )}

        {status === 'missing' && (
          <>
            <svg
              className="w-12 h-12 text-yellow-500 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            <h1 className="text-xl font-bold text-gray-900">Invalid link</h1>
            <p className="text-gray-500 text-sm mt-2">
              No verification token found. Check your email for the correct link.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-blue-600 hover:underline text-sm"
            >
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
