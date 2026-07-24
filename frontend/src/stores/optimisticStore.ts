import { create } from 'zustand';

interface OptimisticUpdate<T = any> {
  id: string;
  entityType: string;
  entityId: string;
  previousData: T;
  optimisticData: Partial<T>;
  timestamp: number;
}

interface OptimisticStore {
  updates: OptimisticUpdate[];
  addUpdate: (update: Omit<OptimisticUpdate, 'timestamp'>) => void;
  removeUpdate: (id: string) => void;
  rollbackEntity: (entityType: string, entityId: string) => OptimisticUpdate | undefined;
  clearExpired: (maxAgeMs?: number) => void;
}

export const useOptimisticStore = create<OptimisticStore>((set, get) => ({
  updates: [],

  addUpdate: (update) => {
    const existing = get().updates.find(
      u => u.entityType === update.entityType && u.entityId === update.entityId
    );
    if (existing) {
      set(state => ({
        updates: state.updates.map(u =>
          u.id === existing.id
            ? { ...update, timestamp: Date.now() }
            : u
        ),
      }));
    } else {
      set(state => ({
        updates: [...state.updates, { ...update, timestamp: Date.now() }],
      }));
    }
  },

  removeUpdate: (id) => {
    set(state => ({
      updates: state.updates.filter(u => u.id !== id),
    }));
  },

  rollbackEntity: (entityType, entityId) => {
    const update = get().updates.find(
      u => u.entityType === entityType && u.entityId === entityId
    );
    if (update) {
      set(state => ({
        updates: state.updates.filter(u => u.id !== update.id),
      }));
    }
    return update;
  },

  clearExpired: (maxAgeMs = 30000) => {
    const now = Date.now();
    set(state => ({
      updates: state.updates.filter(u => now - u.timestamp < maxAgeMs),
    }));
  },
}));
