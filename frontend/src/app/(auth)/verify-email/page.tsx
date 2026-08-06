'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  const hasAutoSubmitted = useRef(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

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
      setSuccess('Email verified successfully! Redirecting...');
      setTimeout(() => {
        router.push(callbackUrl);
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

  useEffect(() => {
    if (token && email && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      void onSubmit({ otp: token });
    }
  }, [token, email]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative">
      {/* Back to home */}
      <Link
        href="/"
        className="absolute left-4 top-4 md:left-8 md:top-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Home
      </Link>

      {/* Login link */}
      <Link
        href="/login"
        className="absolute right-4 top-4 md:right-8 md:top-8 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
      >
        Sign in
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-lg font-bold">MV</span>
              </div>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
          <CardDescription>
            Enter the verification code sent to your email
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm" role="status">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
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
                disabled={isLoading}
                aria-invalid={errors.otp ? 'true' : 'false'}
                aria-describedby={errors.otp ? 'otp-error' : undefined}
                className="text-center text-lg tracking-widest"
              />
              {errors.otp && (
                <p id="otp-error" className="text-sm text-destructive" role="alert">
                  {errors.otp.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify email'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              {resendLoading ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Didn&apos;t receive the email?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Create a new account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
