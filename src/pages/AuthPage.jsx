import LoginForm from "../features/auth/components/LoginForm";
import { SkeletonButton, SkeletonInput } from "../components/ui/Skeleton";

export default function AuthPage() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center bg-transparent px-4 py-8 sm:px-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl card-surface ring-1 ring-gold-500/20 shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-guild-800 via-guild-850 to-guild-900 px-6 py-8 text-center border-b border-gold-500/20">
          <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-gold-500/10 blur-2xl" />
          <h1 className="relative text-3xl font-display gold-gradient-text">GUILD</h1>
          <p className="mt-1 text-[11px] text-gold-300/80 uppercase tracking-[0.25em]">
            Rule it or join it
          </p>
        </div>
        <div className="px-6 py-8 flex items-center justify-center">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

// Skeleton placeholder used while the Google Sign-In script is loading.
// Exported for use in tests/Storybook stories.
export function AuthPageSkeleton() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center bg-transparent px-4 py-8 sm:px-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl card-surface ring-1 ring-gold-500/20 shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-guild-800 via-guild-850 to-guild-900 px-6 py-8 text-center border-b border-gold-500/20">
          <h1 className="relative text-3xl font-display gold-gradient-text">GUILD</h1>
          <p className="mt-1 text-[11px] text-gold-300/80 uppercase tracking-[0.25em]">
            Loading sign-in…
          </p>
        </div>
        <div className="px-6 py-8 space-y-4">
          <SkeletonInput className="h-11 w-full" />
          <SkeletonButton className="w-full" />
          <div className="h-3 w-3/4 mx-auto bg-guild-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}