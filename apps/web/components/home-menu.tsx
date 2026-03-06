"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CREATE_PAGE_PATH } from "@/lib/routes";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type HomeAction =
  | { kind: "route"; href: string; label: string }
  | { kind: "logout"; label: string };

const PRIMARY_MENU_ITEMS: HomeAction[] = [
  { kind: "route", href: "/battle", label: "Start Battle" },
  { kind: "route", href: "/library", label: "All Pokemon" },
  { kind: "route", href: CREATE_PAGE_PATH, label: "Create New Pokemon" }
];

const LOGOUT_ITEM: HomeAction = { kind: "logout", label: "Log Out" };
const MENU_ITEMS: HomeAction[] = [...PRIMARY_MENU_ITEMS, LOGOUT_ITEM];

export function HomeMenu() {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const selectedAction = useMemo<HomeAction>(
    () => MENU_ITEMS[selectedIndex] ?? PRIMARY_MENU_ITEMS[0],
    [selectedIndex]
  );

  const runAction = async (action: HomeAction) => {
    if (action.kind === "route") {
      router.push(action.href);
      return;
    }

    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => (current + 1) % MENU_ITEMS.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => (current - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void runAction(selectedAction);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedAction, isLoggingOut, router]);

  return (
    <>
      <nav className="home-menu" aria-label="Home actions">
        {PRIMARY_MENU_ITEMS.map((item, index) => (
          <Link
            key={item.kind === "route" ? item.href : item.label}
            href={item.kind === "route" ? item.href : "/"}
            className={`home-menu-button${selectedIndex === index ? " is-selected" : ""}`}
            onMouseEnter={() => setSelectedIndex(index)}
            onFocus={() => setSelectedIndex(index)}
            onClick={(event) => {
              event.preventDefault();
              void runAction(item);
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        className={`home-logout-button${selectedAction.kind === "logout" ? " is-selected" : ""}`}
        onMouseEnter={() => setSelectedIndex(MENU_ITEMS.length - 1)}
        onFocus={() => setSelectedIndex(MENU_ITEMS.length - 1)}
        onClick={() => void runAction(LOGOUT_ITEM)}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? "Logging Out..." : "Log Out"}
      </button>
    </>
  );
}
