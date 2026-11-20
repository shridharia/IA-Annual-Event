import type { Metadata } from "next";
import { getOrganizer } from "@/lib/auth";
import LoginForm from "@/components/organizer/LoginForm";
import Dashboard from "@/components/organizer/Dashboard";
import SignOut from "@/components/organizer/SignOut";

export const metadata: Metadata = { title: "Organizer", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrganizerPage() {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!configured) {
    return (
      <main className="wrap section">
        <h1 className="display text-4xl">Organizer setup required</h1>
        <p className="mt-4 text-dim">Supabase environment variables are missing. See docs/SETUP.md.</p>
      </main>
    );
  }
  // Authorization happens on the server on every request; hiding the link is not the security boundary.
  const { organizer, signedIn } = await getOrganizer();
  if (!signedIn) return <LoginForm />;
  if (!organizer) {
    return (
      <main className="grid min-h-svh place-items-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="display text-4xl">Not authorised</h1>
          <p className="mt-4 text-dim">This account isn&apos;t an organizer. Ask an admin to add you to the organizers table.</p>
          <div className="mt-6"><SignOut /></div>
        </div>
      </main>
    );
  }
  return <Dashboard email={organizer.email} />;
}
