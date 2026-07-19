import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="mt-auto border-t border-card-border bg-black/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold">The Koharu Project</p>
            <p className="prose-muted mt-1 text-sm">
              Adult AI companions · IRL media vault
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <Link href="/features" className="hover:text-foreground">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Sign up
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-card-border/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/content-policy" className="hover:text-foreground">
              Content policy
            </Link>
            <a
              href="mailto:abuse@thekoharuproject.com"
              className="hover:text-foreground"
            >
              Report abuse
            </a>
          </div>
          <div className="text-xs text-muted sm:text-right">
            <p>© {new Date().getFullYear()} The Koharu Project</p>
            <p className="mt-0.5 text-accent-soft/70">
              Strictly 18+ · All characters 18–20
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
