'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  marketingOptIn: boolean;
  preferredLlmProvider?: string;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const [displayName, setDisplayName] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [preferredLlmProvider, setPreferredLlmProvider] = useState('groq_llama');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: () => apiRequest<UserProfile>('/v1/users/me'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/v1/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest('/v1/users/me', { method: 'DELETE' }),
    onSuccess: () => {
      logout();
      window.location.href = '/';
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-red-600">Failed to load profile</p>;
  }

  const currentDisplayName = displayName || user.displayName || '';

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

      <Card className="p-6 space-y-6">
        <div>
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium">{user.email}</p>
          {!user.emailVerified && (
            <p className="text-sm text-yellow-600 mt-1">Email not verified</p>
          )}
        </div>

        <div>
          <Input
            label="Display Name"
            defaultValue={currentDisplayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="marketingOptIn"
            checked={marketingOptIn ?? user.marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="marketingOptIn" className="text-sm text-gray-700">
            Receive product updates and tips
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred LLM Provider</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={preferredLlmProvider || user.preferredLlmProvider || 'groq_llama'}
            onChange={(e) => setPreferredLlmProvider(e.target.value)}
          >
            <option value="groq_llama">Groq Llama 3 70B</option>
            <option value="groq_mixtral">Groq Mixtral 8x7B</option>
            <option value="gemini">Gemini 1.5 Pro</option>
          </select>
        </div>

        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            Profile updated successfully
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => updateMutation.mutate({
              displayName: currentDisplayName,
              marketingOptIn: marketingOptIn ?? user.marketingOptIn,
              preferredLlmProvider: preferredLlmProvider || user.preferredLlmProvider,
            })}
            loading={updateMutation.isPending}
          >
            Save Changes
          </Button>
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">Permanently delete your account and all associated data.</p>
        <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>
          Delete Account
        </Button>
      </Card>

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete Account"
        onConfirm={() => deleteMutation.mutate()}
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
        variant="danger"
      >
        <p>Are you sure you want to delete your account? This action cannot be undone. All your disputes and data will be permanently removed.</p>
        {deleteMutation.isError && (
          <p className="text-red-600 text-sm mt-2">Failed to delete account: {(deleteMutation.error as any)?.message}</p>
        )}
      </Dialog>
    </div>
  );
}
