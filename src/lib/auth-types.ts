import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAnonymous: boolean;
  isLoading: boolean;
}
