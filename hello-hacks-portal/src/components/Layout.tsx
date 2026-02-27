"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ComponentType
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import {
  AdjustmentsHorizontalIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ChartBarSquareIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  HomeIcon,
  LinkIcon,
  QueueListIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
  UserGroupIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { useClientSession, clearSession, type Session } from "@/lib/session";
import { db, EVENT_ID } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

type Role = Session["role"] | "guest";

type NavItem = {
  name: string;
  href: string;
  hint: string;
  icon: ComponentType<ComponentProps<"svg">>;
  match: RegExp;
};

type NavSection = {
  name: string;
  items: NavItem[];
};

type PageInfo = {
  match: RegExp;
  title: string;
  subtitle: string;
};

const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  admin: [
    {
      name: "Event Controls",
      items: [
        {
          name: "Dashboard",
          href: "/admin",
          hint: "Overview and quick access",
          icon: HomeIcon,
          match: /^\/admin$/
        },
        {
          name: "Event Settings",
          href: "/admin/settings",
          hint: "Phase, locks, and visibility",
          icon: Cog6ToothIcon,
          match: /^\/admin\/settings$/
        },
        {
          name: "Judges",
          href: "/admin/judges",
          hint: "Manage judge profiles",
          icon: UserGroupIcon,
          match: /^\/admin\/judges$/
        },
        {
          name: "Teams",
          href: "/admin/teams",
          hint: "Edit team records and links",
          icon: ClipboardDocumentListIcon,
          match: /^\/admin\/teams(?:\/.*)?$/
        },
        {
          name: "Assignments",
          href: "/admin/assign",
          hint: "Balance judge coverage",
          icon: AdjustmentsHorizontalIcon,
          match: /^\/admin\/assign$/
        },
        {
          name: "Rubric",
          href: "/admin/rubric",
          hint: "Criteria and weighting",
          icon: ClipboardDocumentCheckIcon,
          match: /^\/admin\/rubric$/
        }
      ]
    },
    {
      name: "Operations",
      items: [
        {
          name: "Links Manager",
          href: "/admin/links",
          hint: "Team demo and repo links",
          icon: LinkIcon,
          match: /^\/admin\/links$/
        },
        {
          name: "Finals Setup",
          href: "/admin/finals",
          hint: "Final judge/team workflow",
          icon: TrophyIcon,
          match: /^\/admin\/finals$/
        },
        {
          name: "Seed Teams",
          href: "/admin/seed-teams",
          hint: "Bulk import helper",
          icon: SparklesIcon,
          match: /^\/admin\/seed-teams$/
        },
        {
          name: "Live Results",
          href: "/results",
          hint: "Leaderboard and detail views",
          icon: ChartBarSquareIcon,
          match: /^\/results$/
        }
      ]
    }
  ],
  judge: [
    {
      name: "Judging",
      items: [
        {
          name: "Assigned Teams",
          href: "/judge",
          hint: "Review your prelim queue",
          icon: QueueListIcon,
          match: /^\/judge(?:\/(?!finals(?:\/|$))[^/]+)?$/
        },
        {
          name: "Finals Queue",
          href: "/judge/finals",
          hint: "Final round scoring",
          icon: TrophyIcon,
          match: /^\/judge\/finals(?:\/.*)?$/
        },
        {
          name: "Results",
          href: "/results",
          hint: "Current leaderboard",
          icon: ChartBarSquareIcon,
          match: /^\/results$/
        }
      ]
    }
  ],
  team: [
    {
      name: "Team Workspace",
      items: [
        {
          name: "Submission",
          href: "/submit",
          hint: "Project links, summary, assets",
          icon: ClipboardDocumentCheckIcon,
          match: /^\/submit(?:\/.*)?$/
        },
        {
          name: "My Feedback",
          href: "/team/feedback",
          hint: "Judge notes and scores",
          icon: ClipboardDocumentListIcon,
          match: /^\/team\/feedback$/
        },
        {
          name: "Results",
          href: "/results",
          hint: "Public standings view",
          icon: ChartBarSquareIcon,
          match: /^\/results$/
        }
      ]
    }
  ],
  guest: [
    {
      name: "Portal",
      items: [
        {
          name: "Sign In",
          href: "/auth",
          hint: "Admin, judge, or team access",
          icon: ShieldCheckIcon,
          match: /^\/auth$/
        },
        {
          name: "Results",
          href: "/results",
          hint: "Leaderboard and team rankings",
          icon: ChartBarSquareIcon,
          match: /^\/results$/
        }
      ]
    }
  ]
};

const PAGE_INFO: PageInfo[] = [
  {
    match: /^\/auth$/,
    title: "Sign In",
    subtitle: "Choose your role and continue with your access code."
  },
  {
    match: /^\/admin$/,
    title: "Admin Console",
    subtitle: "Event configuration, assignments, and review oversight."
  },
  {
    match: /^\/admin\/settings$/,
    title: "Event Settings",
    subtitle: "Control phase, locks, visibility, and defaults."
  },
  {
    match: /^\/admin\/judges$/,
    title: "Judges",
    subtitle: "Manage judge accounts and permissions."
  },
  {
    match: /^\/admin\/teams$/,
    title: "Teams",
    subtitle: "Browse and edit all participating teams."
  },
  {
    match: /^\/admin\/teams\/.+$/,
    title: "Team Detail",
    subtitle: "Review links, members, and submission data for one team."
  },
  {
    match: /^\/admin\/assign$/,
    title: "Assignments",
    subtitle: "Configure and validate judge coverage."
  },
  {
    match: /^\/admin\/rubric$/,
    title: "Rubric",
    subtitle: "Edit scoring criteria and weights."
  },
  {
    match: /^\/admin\/links$/,
    title: "Links Manager",
    subtitle: "Maintain project, demo, and repository links."
  },
  {
    match: /^\/admin\/finals$/,
    title: "Finals Setup",
    subtitle: "Select finalists and finals judge roster."
  },
  {
    match: /^\/admin\/seed-teams$/,
    title: "Seed Teams",
    subtitle: "Bulk import and preparation workflow."
  },
  {
    match: /^\/judge$/,
    title: "Assigned Teams",
    subtitle: "Complete your preliminary team reviews."
  },
  {
    match: /^\/judge\/finals$/,
    title: "Finals Queue",
    subtitle: "Track and complete finals judging assignments."
  },
  {
    match: /^\/judge\/finals\/.+$/,
    title: "Finals Team Review",
    subtitle: "Submit final-round scores and rationale."
  },
  {
    match: /^\/judge\/[^/]+$/,
    title: "Team Review",
    subtitle: "Score and submit feedback for this team."
  },
  {
    match: /^\/submit$/,
    title: "Team Submission",
    subtitle: "Update your project links, summary, and assets."
  },
  {
    match: /^\/team\/feedback$/,
    title: "My Feedback",
    subtitle: "Read judge feedback for your team."
  },
  {
    match: /^\/results$/,
    title: "Results",
    subtitle: "Live standings, coverage, and score breakdowns."
  }
];

function roleFromSession(session: Session | null): Role {
  return session?.role ?? "guest";
}

function homeHrefForRole(role: Role) {
  if (role === "admin") return "/admin";
  if (role === "judge") return "/judge";
  if (role === "team") return "/submit";
  return "/auth";
}

function roleTag(session: Session | null) {
  if (!session) return "Guest";
  if (session.role === "admin") return "Admin";
  if (session.role === "judge") return "Judge";
  return "Team";
}

function roleDisplayName(session: Session | null) {
  if (!session) return "Not signed in";
  if (session.role === "admin") return session.name || "Admin";
  if (session.role === "judge") return session.name || "Judge";
  return session.name || "Team";
}

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { ready, session } = useClientSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [phase, setPhase] = useState("");
  const [showTeamFeedback, setShowTeamFeedback] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "events", EVENT_ID),
      (snap) => {
        const data = snap.exists()
          ? (snap.data() as { phase?: string; showTeamFeedback?: boolean })
          : undefined;
        setPhase(data?.phase || "");
        setShowTeamFeedback(data?.showTeamFeedback !== false);
      },
      () => {
        setPhase("");
        setShowTeamFeedback(true);
      }
    );
    return () => unsub();
  }, []);

  const rawPath = router.asPath.split("?")[0];
  const path =
    rawPath.length > 1 && rawPath.endsWith("/")
      ? rawPath.slice(0, -1)
      : rawPath;
  const role = roleFromSession(session);
  const showJudgeFinals = phase === "finals";
  const sections = useMemo(() => {
    const base = NAV_BY_ROLE[role];
    return base.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (role === "judge" && !showJudgeFinals && item.href === "/judge/finals") {
          return false;
        }
        if (
          role === "team" &&
          !showTeamFeedback &&
          item.href === "/team/feedback"
        ) {
          return false;
        }
        return true;
      })
    }));
  }, [role, showJudgeFinals, showTeamFeedback]);
  const flatItems = sections.flatMap((section) => section.items);
  const activeItem = flatItems.find((item) => item.match.test(path)) || null;
  const pageInfo = PAGE_INFO.find((item) => item.match.test(path));
  const pageTitle = pageInfo?.title || activeItem?.name || "TechStrat Portal";

  function signOut() {
    clearSession();
    router.replace("/auth");
  }

  const accountLabel = useMemo(() => roleDisplayName(session), [session]);
  const accountRole = useMemo(() => roleTag(session), [session]);

  const SidebarItems = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-1">
        <Link
          href={homeHrefForRole(role)}
          onClick={() => mobile && setSidebarOpen(false)}
          className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
        >
          <div className="grid size-8 place-items-center rounded-lg bg-cyan-400/20 text-xs font-bold text-cyan-200">
            TS
          </div>
          <div>
            <p className="text-sm font-semibold text-white">TechStrat</p>
            <p className="text-[11px] text-slate-400">Judging Portal</p>
          </div>
        </Link>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5"
          >
            <span className="sr-only">Close menu</span>
            <XMarkIcon className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-6 space-y-6 overflow-y-auto pr-1">
        {sections.map((section) => (
          <div key={section.name}>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {section.name}
            </p>
            <ul className="space-y-1.5">
              {section.items.map((item) => {
                const active = item.match.test(path);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => mobile && setSidebarOpen(false)}
                      className={[
                        "group flex items-center gap-3 rounded-xl border px-3 py-2 transition",
                        active
                          ? "border-cyan-300/40 bg-cyan-300/10 text-white shadow-[0_0_0_1px_rgba(103,232,249,0.08)]"
                          : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                      ].join(" ")}
                    >
                      <item.icon
                        className={[
                          "size-4 shrink-0",
                          active
                            ? "text-cyan-200"
                            : "text-slate-500 group-hover:text-slate-200"
                        ].join(" ")}
                      />
                      <span className="block min-w-0 truncate text-sm font-medium">
                        {item.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Signed In
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-100">
              {accountLabel}
            </p>
          </div>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-200">
            {accountRole}
          </span>
        </div>
        {ready && session ? (
          <button
            onClick={signOut}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
          >
            <ArrowRightOnRectangleIcon className="size-4" />
            Sign Out
          </button>
        ) : (
          <Link
            href="/auth"
            onClick={() => mobile && setSidebarOpen(false)}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#05070d] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -right-20 top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className="relative z-50 xl:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-12 flex w-full max-w-sm transform flex-1 transition duration-200 data-[closed]:-translate-x-full"
          >
            <div className="m-3 flex w-full grow rounded-3xl border border-white/10 bg-[#0a111f]/95 p-4 shadow-2xl shadow-black/40">
              <SidebarItems mobile />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <div className="hidden xl:fixed xl:inset-y-0 xl:z-40 xl:flex xl:w-[22rem] xl:flex-col">
        <div className="m-4 flex grow rounded-3xl border border-white/10 bg-[#0a111f]/90 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="w-full">
            <SidebarItems />
          </div>
        </div>
      </div>

      <div className="relative z-10 xl:pl-[22rem]">
        <div className="sticky top-0 z-30 px-3 pb-2 pt-3 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 backdrop-blur-xl sm:px-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10 xl:hidden"
              >
                <span className="sr-only">Open sidebar</span>
                <Bars3Icon className="size-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100 sm:text-base">
                  {pageTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-200 sm:inline-flex">
                {accountRole}
              </span>
              {ready && session ? (
                <button
                  onClick={signOut}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  <ArrowRightOnRectangleIcon className="size-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                  <span className="sm:hidden">Out</span>
                </button>
              ) : (
                <Link
                  href="/auth"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-3 pb-10 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
