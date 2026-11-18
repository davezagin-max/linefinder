"use client";

import { Search, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";

const TABS = [
  { href: "/browse/skis", label: "Ski" },
  { href: "/browse/snowboards", label: "Snowboard" },
  { href: "/browse/bindings", label: "Bindings" },
  { href: "/browse/boots", label: "Boots" },
];

function SearchForm({ autoFocus = false }: { autoFocus?: boolean }) {
  return (
    <form action={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/search/`} role="search" className="relative w-full">
      <label htmlFor="site-search" className="sr-only">
        Search gear
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
      <input
        id="site-search"
        name="q"
        type="search"
        autoFocus={autoFocus}
        placeholder="Search skis, boards, boots…"
        className="w-full rounded-full border-2 border-line bg-glacier/60 py-2 pl-9 pr-4 text-sm focus:border-trail-blue focus:bg-white focus:outline-none"
      />
    </form>
  );
}

export function Header() {
  const path = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-snow/90 backdrop-blur supports-[backdrop-filter]:bg-snow/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Linefinder home" className="shrink-0 rounded-lg">
          <Logo />
        </Link>

        <nav aria-label="Shop by category" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {TABS.map((t) => {
              const active = path?.startsWith(t.href);
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3.5 py-2 font-display text-[1.05rem] font-semibold transition-colors ${
                      active ? "bg-night text-white" : "text-ink-soft hover:bg-glacier hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto hidden w-full max-w-xs lg:block">
          <SearchForm />
        </div>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <button
            type="button"
            className="rounded-full p-2.5 text-ink-soft hover:bg-glacier hover:text-ink lg:hidden"
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((o) => !o)}
          >
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 font-display font-semibold text-ink-soft hover:bg-glacier hover:text-ink"
          >
            <UserRound className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">My Profile</span>
            <span className="sr-only sm:hidden">My Profile</span>
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-line px-4 py-3 lg:hidden">
          <SearchForm autoFocus />
        </div>
      )}

      {/* Category tabs scroll sideways on small screens. */}
      <nav aria-label="Shop by category" className="border-t border-line md:hidden">
        <ul className="flex gap-1 overflow-x-auto px-3 py-2">
          {TABS.map((t) => (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={path?.startsWith(t.href) ? "page" : undefined}
                className={`block rounded-full px-3 py-1.5 font-display font-semibold ${
                  path?.startsWith(t.href) ? "bg-night text-white" : "text-ink-soft"
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
