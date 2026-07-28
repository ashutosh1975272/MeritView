'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiClient } from '@/lib/api-client';

interface ProfileForm {
  displayName: string;
  email: string;
  marketingOptIn: boolean;
  preferredLlmProvider: string;
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    defaultValues: {
      displayName: user?.displayName || '',
      email: user?.email || '',
      marketingOptIn: false,
      preferredLlmProvider: 'auto',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName || '',
        email: user.email || '',
        marketingOptIn: false,
        preferredLlmProvider: 'auto',
      });
    }
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (data: Partial<ProfileForm>) =>
      apiClient.patch('/users/me', data),
    onSuccess: (updatedUser: any) => {
      setUser(updatedUser);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    },
  });

  const onSubmit = (data: ProfileForm) => {
    setSuccess(null);
    mutation.mutate({
      displayName: data.displayName || undefined,
      marketingOptIn: data.marketingOptIn,
      preferredLlmProvider: data.preferredLlmProvider,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account information and preferences.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm" role="status">
            {success}
          </div>
        )}

        {mutation.isError && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm" role="alert">
            {(mutation.error as any)?.message || 'Failed to update profile'}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="displayName" className="block text-sm font-medium">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              maxLength={100}
              {...register('displayName', {
                maxLength: { value: 100, message: 'Display name must be 100 characters or less' },
              })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={mutation.isPending}
            />
            {errors.displayName && (
              <p className="text-sm text-destructive" role="alert">{errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              disabled
              className="w-full px-3 py-2 border border-border rounded-md bg-muted text-sm text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support for email changes.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="preferredLlmProvider" className="block text-sm font-medium">
              Preferred LLM Provider
            </label>
            <select
              id="preferredLlmProvider"
              {...register('preferredLlmProvider')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={mutation.isPending}
            >
              <option value="auto">Auto (Best Available)</option>
              <option value="groq">Groq (Llama 3 70B / Mixtral 8x7B)</option>
              <option value="gemini">Gemini 1.5 Pro</option>
            </select>
            <p className="text-xs text-muted-foreground">Select your preferred AI provider for dispute analysis.</p>
          </div>

          <div className="flex items-center gap-3 p-4 border border-border rounded-lg">
            <input
              id="marketingOptIn"
              type="checkbox"
              {...register('marketingOptIn')}
              className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
              disabled={mutation.isPending}
            />
            <label htmlFor="marketingOptIn" className="text-sm text-muted-foreground">
              Send me product updates and tips
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button
            type="submit"
            disabled={mutation.isPending || !isDirty}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => reset()}
            disabled={mutation.isPending || !isDirty}
            className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md disabled:opacity-50 transition-colors"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
