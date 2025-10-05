"use client";

import { ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useClientSession, clearSession } from "@/lib/session";

type NavItem = { name: string; href: string };

const nav: NavItem[] = [
  { name: "Judge", href: "/judge" },
  { name: "Results", href: "/results" },
  { name: "Admin", href: "/admin" },
  { name: "Submit", href: "/submit" }
];

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { ready, session } = useClientSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeHref = router.pathname;
  const isActive = (href: string) =>
    activeHref === href || activeHref.startsWith(href + "/");

  function signOut() {
    clearSession();
    router.replace("/auth");
  }

  const roleLabel = useMemo(() => {
    if (!session) return "Guest";
    if (session.role === "admin") return "Admin";
    if (session.role === "judge") return session.name || "Judge";
    if (session.role === "team") return session.name || "Team";
    return "User";
  }, [session]);

  return (
    <div className="min-h-dvh bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
      {/* Mobile sidebar */}
      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className="relative z-50 xl:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/60 transition-opacity duration-200 data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs transform flex-1 bg-white ring-1 ring-gray-200 transition duration-200 data-[closed]:-translate-x-full dark:bg-gray-900 dark:ring-white/10"
          >
            <div className="flex grow flex-col gap-y-6 overflow-y-auto px-6 pb-6 pt-5">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setSidebarOpen(false)}
                  className="text-base font-semibold"
                >
                  Hello Hacks
                </Link>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="-m-2.5 p-2.5 rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="size-6" aria-hidden="true" />
                </button>
              </div>

              <nav>
                <ul className="space-y-1">
                  {nav.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={[
                          "flex items-center rounded-lg px-3 py-2 text-sm font-medium ring-1 transition",
                          isActive(item.href)
                            ? "bg-indigo-600 text-white ring-indigo-600"
                            : "text-gray-700 ring-gray-200 hover:bg-gray-100 dark:text-gray-300 dark:ring-white/10 dark:hover:bg-white/5"
                        ].join(" ")}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-auto text-xs text-gray-500 dark:text-gray-400">
                Judging made simple.
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Desktop static sidebar */}
      <div className="hidden xl:fixed xl:inset-y-0 xl:z-40 xl:flex xl:w-72 xl:flex-col">
        <div className="flex grow flex-col gap-y-6 overflow-y-auto bg-gray-50 px-6 py-5 ring-1 ring-gray-200 dark:bg-black/10 dark:ring-white/10">
          <div className="text-base font-semibold">Hello Hacks</div>
          <nav>
            <ul className="space-y-1">
              {nav.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={[
                      "flex items-center rounded-lg px-3 py-2 text-sm font-medium ring-1 transition",
                      isActive(item.href)
                        ? "bg-indigo-600 text-white ring-indigo-600"
                        : "text-gray-700 ring-gray-200 hover:bg-gray-100 dark:text-gray-300 dark:ring-white/10 dark:hover:bg-white/5"
                    ].join(" ")}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-auto text-xs text-gray-500 dark:text-gray-400">
            {ready && session ? (
              <>
                Signed in as{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {roleLabel}
                </span>
              </>
            ) : (
              <>Not signed in</>
            )}
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:px-6 lg:px-8 dark:border-white/10 dark:bg-gray-900/90">
        <div className="flex h-16 items-center justify-between">
          {/* Left: mobile menu + brand */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 xl:hidden dark:text-gray-200 dark:hover:bg-white/5"
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="size-5" aria-hidden="true" />
            </button>
            <Link
              href="/"
              className="text-sm font-semibold text-indigo-600 dark:text-indigo-400"
            >
              Hello Hacks Portal
            </Link>
          </div>

          {/* Right: identity / auth */}
          <div className="flex items-center gap-3">
            {ready && session ? (
              <>
                <span className="hidden sm:block text-xs text-gray-600 dark:text-gray-400">
                  {roleLabel}{" "}
                  <span className="text-gray-500">({session.role})</span>
                </span>
                <button
                  onClick={signOut}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="xl:pl-72">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
