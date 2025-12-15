
import Link from 'next/link';
import AuthButton from '@/components/AuthButton';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export default function Home() {


  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          SnapDocs
        </h1>
        <AuthButton />
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="max-w-3xl space-y-8">
          <h1 className="text-6xl font-bold tracking-tighter text-foreground sm:text-7xl">
            Documentation, <br />
            <span className="text-zinc-500">Auto-generated.</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-[600px] mx-auto leading-relaxed">
            Transform merged pull requests into comprehensive documentation,
            changelogs, and code summaries with zero manual effort.
          </p>

          <div className="flex justify-center gap-4 pt-4">
            <SignedIn>
              <Link href="/dashboard">
                <Button size="lg" className="h-12 px-8 text-base">
                  Go to Dashboard
                </Button>
              </Link>
            </SignedIn>
            <SignedOut>

            </SignedOut>
          </div>

        </div>
      </main>
    </div>
  );
}