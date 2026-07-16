import type { Metadata } from "next";
import { AdminPanel } from "@/components/analytics/admin-panel";
import { isAuthConfigured } from "@/lib/analytics/auth";

// Belt and braces with robots.ts and the X-Robots-Tag header from
// next.config.ts: this one covers crawlers that render the page anyway.
export const metadata: Metadata = {
  title: "analytics",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The session lives in memory in the client (see useAdminSession), so there is
 * nothing here for the server to read and nothing user-specific to render. This
 * stays a thin server component purely to keep the env check server-side —
 * whether auth is *configured* is safe to expose, but ADMIN_PASSWORD must never
 * reach a client bundle, so only the boolean crosses.
 *
 * force-dynamic because the answer depends on env at request time, not build
 * time.
 */
export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <AdminPanel configured={isAuthConfigured()} />;
}
