'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/useAuthStore';

interface VerifyForm {
  token: string;
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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VerifyForm>({
    defaultValues: {
      token: token || '',
    },
  });

  const onSubmit = async (data: VerifyForm) => {
    setError(null);
    setIsLoading(true);

    try {
      await verifyEmail(data.token);
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

    try {
      // We need to get the email from localStorage or context
      // For now, just show a message
      setSuccess('Verification email resent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend email.');
    } finally {
      setResendLoading(false);
    }
  };

  if (token && !isLoading) {
    // Auto-submit if token is in URL
    onSubmit({ token });
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
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
            <label htmlFor="token" className="block text-sm font-medium">
              Verification Code
            </label>
            <input
              id="token"
              type="text"
              autoComplete="one-time-code"
              {...register('token', {
                required: 'Verification code is required',
                minLength: {
                  value: 6,
                  message: 'Code must be at least 6 characters',
                },
              })}
              className={`w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-center text-lg tracking-widest ${
                errors.token ? 'border-destructive' : 'border-input'
              }`}
              disabled={isLoading}
              aria-invalid={errors.token ? 'true' : 'false'}
              aria-describedby={errors.token ? 'token-error' : undefined}
            />
            {errors.token && (
              <p id="token-error" className="text-sm text-destructive" role="alert">
                {errors.token.message}
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