'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/useAuthStore';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  acceptTerms: boolean;
  marketingOptIn: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      marketingOptIn: false,
    },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
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
      router.push('/verify-email');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-2xl mb-6">
            <span className="text-3xl">⚖️</span>
            <span>MeritView</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
          <p className="text-muted-foreground mt-2">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {error && (
            <div
              className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              className={`w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
                errors.email ? 'border-destructive' : 'border-input'
              }`}
              disabled={isLoading}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="displayName" className="block text-sm font-medium">
              Display Name (optional)
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              maxLength={100}
              {...register('displayName', {
                maxLength: {
                  value: 100,
                  message: 'Display name must be 100 characters or less',
                },
              })}
              className={`w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
                errors.displayName ? 'border-destructive' : 'border-input'
              }`}
              disabled={isLoading}
            />
            {errors.displayName && (
              <p className="text-sm text-destructive" role="alert">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
                pattern: {
                  value: /^(?=.*[A-Za-z])(?=.*\d)/,
                  message: 'Password must contain at least 1 letter and 1 number',
                },
              })}
              className={`w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
                errors.password ? 'border-destructive' : 'border-input'
              }`}
              disabled={isLoading}
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && (
              <p id="password-error" className="text-sm text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              At least 8 characters with 1 letter and 1 number
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
              className={`w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
                errors.confirmPassword ? 'border-destructive' : 'border-input'
              }`}
              disabled={isLoading}
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <input
                id="acceptTerms"
                type="checkbox"
                {...register('acceptTerms', {
                  required: 'You must accept the terms',
                  value: true,
                })}
                className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                disabled={isLoading}
              />
              <label htmlFor="acceptTerms" className="text-sm text-muted-foreground">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                <span className="text-destructive">*</span>
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="text-sm text-destructive ml-7" role="alert">
                {errors.acceptTerms.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="marketingOptIn"
              type="checkbox"
              {...register('marketingOptIn')}
              className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
              disabled={isLoading}
            />
            <label htmlFor="marketingOptIn" className="text-sm text-muted-foreground">
              Send me product updates and tips (optional)
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          We&apos;ll send a verification email to your address. Check your inbox (and spam folder) after signing up.
        </p>
      </div>
    </div>
  );
}