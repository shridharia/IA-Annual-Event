"use client";
import { supabaseBrowser } from "@/lib/supabase/browser";
export default function SignOut() {
  return (
    <button className="btn btn-ghost" onClick={async () => { await supabaseBrowser().auth.signOut(); location.reload(); }}>Sign out</button>
  );
}
