"use client";

import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import RoleGate from "@/components/RoleGate";
import Link from "next/link";

function AdminHome() {
  const control = [
    {
      name: "Event Settings",
      href: "/admin/settings",
      desc: "Event phase, lock states, and results visibility"
    },
    {
      name: "Judges",
      href: "/admin/judges",
      desc: "Create and manage judge profiles and permissions"
    },
    {
      name: "Teams",
      href: "/admin/teams",
      desc: "Manage team records, members, and project metadata"
    },
    {
      name: "Assignments",
      href: "/admin/assign",
      desc: "Auto-balance and manually tune judge coverage"
    },
    {
      name: "Rubric",
      href: "/admin/rubric",
      desc: "Configure scoring criteria, ranges, and weights"
    }
  ];

  const ops = [
    {
      name: "Finals Setup",
      href: "/admin/finals",
      desc: "Select finalists and assign finals judges"
    },
    {
      name: "Links Manager",
      href: "/admin/links",
      desc: "Curate team demo, Devpost, and repository links"
    },
    {
      name: "Seed Teams",
      href: "/admin/seed-teams",
      desc: "Bulk team import utility"
    },
    {
      name: "Results",
      href: "/results",
      desc: "Leaderboard, review details, and export tools"
    }
  ];

  return (
    <RoleGate allow={["admin"]}>
      <Layout>
        <div className="mx-auto max-w-6xl space-y-6 p-2 sm:p-4">
          <section className="rounded-3xl border border-white/10 bg-black/30 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Admin Console
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Admin
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Manage event.
            </p>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                Event Controls
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {control.map((c) => (
                <Link
                  key={c.name}
                  href={c.href}
                  className="rounded-2xl border border-white/10 bg-[#0c1324]/70 p-4 transition hover:border-cyan-300/30 hover:bg-[#111a2f]"
                >
                  <div className="text-base font-semibold text-slate-100">
                    {c.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">{c.desc}</div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                Operations
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {ops.map((c) => (
                <Link
                  key={c.name}
                  href={c.href}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-cyan-300/30 hover:bg-white/5"
                >
                  <div className="text-base font-semibold text-slate-100">
                    {c.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">{c.desc}</div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </Layout>
    </RoleGate>
  );
}

export default dynamic(() => Promise.resolve(AdminHome), { ssr: false });
