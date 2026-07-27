import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
        DesignFlow AI
      </span>
      <h1 className="max-w-lg text-3xl font-medium tracking-tight text-foreground">
        Request a carousel design in a few minutes.
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Pick a template, add your content for each slide, and we&apos;ll take it from there.
        No account needed.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/request/new">Start a request</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/sign-in">Team sign in</Link>
        </Button>
      </div>
    </main>
  );
}
