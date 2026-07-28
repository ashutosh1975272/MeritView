'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/useAuthStore';

interface VerifyForm {
  otp: string;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail, resendVerification } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyForm>({
    defaultValues: {
      otp: token || '',
    },
  });

  const onSubmit = async (data: VerifyForm) => {
    setError(null);
    setIsLoading(true);

    if (!email) {
      setError('Email address is missing. Please try registering again.');
      setIsLoading(false);
      return;
    }

    try {
      await verifyEmail(email, data.otp);
      setSuccess('Email verified successfully! Redirecting to dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResendLoading(true);

    if (!email) {
      setError('Email address is missing. Please try registering again.');
      setResendLoading(false);
      return;
    }

    try {
      await resendVerification(email);
      setSuccess('Verification email resent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend email.');
    } finally {
      setResendLoading(false);
    }
  };

  if (token && email && !isLoading) {
    // Auto-submit if token and email are in URL
    onSubmit({ otp: token });
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative">
      <Link href="/" className="absolute left-4 top-4 md:left-8 md:top-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Home
      </Link>
      <Link href="/login" className="absolute right-4 top-4 md:right-8 md:top-8 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
        Sign in
      </Link>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-2xl mb-6">
            <span className="text-3xl">⚖️</span>
            <span>MeritView</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Verify your email</h1>
          <p className="text-muted-foreground mt-2">
            Enter the verification code sent to your email
          </p>
        </div>

        {success && (
          <div
            className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm"
            role="status"
          >
            {success}
          </div>
        )}

        {error && (
          <div
            className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="space-y-2">
            <label htmlFor="otp" className="block text-sm font-medium">
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              autoComplete="one-time-code"
              {...register('otp', {
                required: 'Verification code is required',
                minLength: {
                  value: 6,
                  message: 'Code must be exactly 6 characters',
                },
                maxLength: {
                  value: 6,
                  message: 'Code must be exactly 6 characters',
                },
              })}
              className={`w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-center text-lg tracking-widest ${
                errors.otp ? 'border-destructive' : 'border-input'
              }`}
              disabled={isLoading}
              aria-invalid={errors.otp ? 'true' : 'false'}
              aria-describedby={errors.otp ? 'otp-error' : undefined}
            />
            {errors.otp && (
              <p id="otp-error" className="text-sm text-destructive" role="alert">
                {errors.otp.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Verifying...' : 'Verify email'}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {resendLoading ? 'Sending...' : 'Resend verification email'}
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t receive the email?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Create a new account
          </Link>
        </p>
      </div>
    </div>
  );
}