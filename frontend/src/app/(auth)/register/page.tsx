'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api-error';

import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormValues } from '@/schemas/auth';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const invitedEmail = searchParams.get('email') || '';

  const {
    control,
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptTerms: false,
      marketingOptIn: false,
      email: invitedEmail,
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      await registerUser({
        email: data.email,
        password: data.password,
        displayName: data.displayName || undefined,
        acceptTerms: data.acceptTerms,
        marketingOptIn: data.marketingOptIn,
      });
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      router.refresh();
    } catch (err: any) {
      const fieldErrors = getApiFieldErrors(err);
      Object.entries(fieldErrors).forEach(([field, message]) => {
        if (field === 'email' || field === 'password' || field === 'displayName' || field === 'acceptTerms') {
          setFieldError(field as keyof RegisterFormValues, { type: 'server', message });
        }
      });
      setError(getApiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-12 relative">
      {/* Back to home */}
      <Link
        href="/"
        className="absolute left-4 top-4 md:left-8 md:top-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Home
      </Link>

      {/* Login link */}
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}${invitedEmail ? `&email=${encodeURIComponent(invitedEmail)}` : ''}`}
        className="absolute right-4 top-4 md:right-8 md:top-8 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 h-9 px-4 py-2 text-slate-600"
      >
        Login
      </Link>

      <Card className="w-full max-w-[440px] border-slate-200 shadow-xl shadow-slate-200/50">
        <CardHeader className="space-y-3 text-center pb-6 pt-8">
          <div className="flex justify-center mb-2">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <span className="text-xl font-bold">MV</span>
              </div>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</CardTitle>
          <CardDescription className="text-base text-slate-500">
            Start resolving disputes with AI-powered analysis
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                {...register('email')}
                disabled={isLoading}
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-medium text-slate-700">Display Name (optional)</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                maxLength={100}
                {...register('displayName')}
                disabled={isLoading}
                aria-invalid={errors.displayName ? 'true' : 'false'}
                aria-describedby={errors.displayName ? 'displayName-error' : undefined}
              />
              {errors.displayName && (
                <p id="displayName-error" className="text-sm text-red-600" role="alert">
                  {errors.displayName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                disabled={isLoading}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
              <p className="text-xs text-slate-500">
                At least 8 characters with 1 letter and 1 number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                disabled={isLoading}
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm text-red-600" role="alert">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Controller
                  name="acceptTerms"
                  control={control}
                  render={({ field }) => (
                    <input
                      id="acceptTerms"
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      disabled={isLoading}
                      aria-invalid={errors.acceptTerms ? 'true' : 'false'}
                      aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
                    />
                  )}
                />
                <label htmlFor="acceptTerms" className="text-sm text-slate-600 leading-tight">
                  I agree to the{' '}
                  <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">Privacy Policy</Link>
                  <span className="text-red-600">*</span>
                </label>
              </div>
              {errors.acceptTerms && (
                <p id="acceptTerms-error" className="text-sm text-red-600 ml-7" role="alert">
                  {errors.acceptTerms.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Controller
                name="marketingOptIn"
                control={control}
                render={({ field }) => (
                  <input
                    id="marketingOptIn"
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    disabled={isLoading}
                  />
                )}
              />
              <label htmlFor="marketingOptIn" className="text-sm text-slate-600 leading-tight">
                Send me product updates and tips (optional)
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}${invitedEmail ? `&email=${encodeURIComponent(invitedEmail)}` : ''}`} className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            We&apos;ll send a verification email to your address. Check your inbox (and spam folder) after signing up.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
