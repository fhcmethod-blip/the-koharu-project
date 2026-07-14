import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-card-border mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-semibold">The Koharu Project</p>
          <p className="prose-muted mt-1 text-sm">Adult AI companions · IRL media vault</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted">
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
        <p className="text-xs text-muted">© {new Date().getFullYear()} The Koharu Project · 18+</p>
      </div>
    </footer>
  );
}
