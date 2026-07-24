'use client';

import { memo } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';

type RegisterFormData = {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  acceptTerms: boolean;
  marketingOptIn: boolean;
};

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const RegisterForm = memo(function RegisterForm({ onSubmit, isLoading, error }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: { marketingOptIn: false },
  });

  const password = watch('password');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="reg-email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          aria-label="Email address"
          aria-required="true"
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
          aria-describedby={errors.email ? 'reg-email-error' : undefined}
        />
        {errors.email && (
          <p id="reg-email-error" className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-displayName" className="block text-sm font-medium">
          Display Name (optional)
        </label>
        <input
          id="reg-displayName"
          type="text"
          autoComplete="name"
          maxLength={100}
          aria-label="Display name"
          {...register('displayName', {
            maxLength: { value: 100, message: 'Display name must be 100 characters or less' },
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
        <label htmlFor="reg-password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          aria-label="Password"
          aria-required="true"
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'Password must be at least 8 characters' },
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
          aria-describedby={errors.password ? 'reg-password-error' : undefined}
        />
        {errors.password && (
          <p id="reg-password-error" className="text-sm text-destructive" role="alert">
            {errors.password.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">At least 8 characters with 1 letter and 1 number</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-confirmPassword" className="block text-sm font-medium">
          Confirm Password
        </label>
        <input
          id="reg-confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-label="Confirm password"
          aria-required="true"
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) => value === password || 'Passwords do not match',
          })}
          className={`w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
            errors.confirmPassword ? 'border-destructive' : 'border-input'
          }`}
          disabled={isLoading}
          aria-invalid={errors.confirmPassword ? 'true' : 'false'}
          aria-describedby={errors.confirmPassword ? 'reg-confirm-error' : undefined}
        />
        {errors.confirmPassword && (
          <p id="reg-confirm-error" className="text-sm text-destructive" role="alert">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <input
            id="reg-acceptTerms"
            type="checkbox"
            aria-label="Accept terms and conditions"
            aria-required="true"
            {...register('acceptTerms', {
              required: 'You must accept the terms',
              value: true,
            })}
            className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
            disabled={isLoading}
          />
          <label htmlFor="reg-acceptTerms" className="text-sm text-muted-foreground">
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
          id="reg-marketingOptIn"
          type="checkbox"
          aria-label="Receive product updates and tips"
          {...register('marketingOptIn')}
          className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
          disabled={isLoading}
        />
        <label htmlFor="reg-marketingOptIn" className="text-sm text-muted-foreground">
          Send me product updates and tips (optional)
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        aria-label="Create your account"
        className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
});
