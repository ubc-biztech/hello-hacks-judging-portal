"use client";

import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import RoleGate from "@/components/RoleGate";
import Link from "next/link";

function AdminHome() {
  return (
    <RoleGate allow={["admin"]}>
      <Layout>
        <div className="mx-auto max-w-6xl p-6">
          <h1 className="text-2xl font-bold">Admin Console</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage judges, teams, settings, and assignments.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Settings",
                href: "/admin/settings",
                desc: "Event name, phases, locks, visibility"
              },
              {
                name: "Judges",
                href: "/admin/judges",
                desc: "Create/edit judges, admin toggle, capacity"
              },
              {
                name: "Teams",
                href: "/admin/teams",
                desc: "Create/edit teams, members, codes, links"
              },
              {
                name: "Assign",
                href: "/admin/assign",
                desc: "Auto + manual judge assignment"
              },
              {
                name: "Rubric",
                href: "/admin/rubric",
                desc: "Edit criteria, weights, scale"
              },
              {
                name: "Links",
                href: "/admin/links",
                desc: "Manage Devpost/Demo links"
              },
              {
                name: "Results",
                href: "/results",
                desc: "Live leaderboard & teams"
              },
              {
                name: "Finals",
                href: "/admin/finals",
                desc: "Final Round Judging"
              }
            ].map((c) => (
              <Link
                key={c.name}
                href={c.href}
                className="rounded-2xl border border-gray-200 p-4 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <div className="text-lg font-semibold">{c.name}</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {c.desc}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Layout>
    </RoleGate>
  );
}

export default dynamic(() => Promise.resolve(AdminHome), { ssr: false });
