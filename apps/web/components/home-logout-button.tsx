"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function HomeLogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  };

  return (
    <button type="button" className="home-logout-button" onClick={handleLogout} disabled={isLoggingOut}>
      {isLoggingOut ? "Logging Out..." : "Log Out"}
    </button>
  );
}
