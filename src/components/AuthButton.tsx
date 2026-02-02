'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';

// TODO: wire into main nav/router
export default function AuthButton() {
  const { user, isAnonymous, isLoading, signInWithGitHub, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-600">
        <span className="inline-block w-2 h-2 rounded-full bg-zinc-700 animate-pulse" />
        initializing...
      </div>
    );
  }

  if (isAnonymous) {
    return (
      <button
        onClick={signInWithGitHub}
        className="flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 transition-colors"
      >
        <GitHubIcon />
        sign in to track history
      </button>
    );
  }

  // Authenticated user
  const avatar = user?.user_metadata?.avatar_url;
  const name = user?.user_metadata?.user_name || user?.email || 'researcher';

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/profile"
        className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="w-5 h-5 rounded-full" />
        ) : (
          <span className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px]">
            {name[0]?.toUpperCase()}
          </span>
        )}
        {name}
      </Link>
      <button
        onClick={signOut}
        className="text-[10px] font-mono text-zinc-700 hover:text-zinc-400 transition-colors"
      >
        sign out
      </button>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
