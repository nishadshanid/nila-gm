import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { UserChip } from "@/components/nav/user-chip";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-6 border-r p-4 md:flex">
        <Link href="/" className="px-3" aria-label="Nila Gym, today">
          <Logo className="h-8" />
        </Link>
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur">
          <Link href="/" className="md:invisible" aria-label="Nila Gym, today">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/search"
              aria-label="Search"
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2"
            >
              <Search className="size-5" />
            </Link>
            <Suspense fallback={<div className="bg-muted h-8 w-40 animate-pulse rounded" />}>
              <UserChip />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-24 md:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
