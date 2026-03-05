"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CREATE_PAGE_PATH } from "@/lib/routes";

const MENU_ITEMS = [
  { href: "/battle", label: "Start Battle" },
  { href: "/library", label: "All Pokemon" },
  { href: CREATE_PAGE_PATH, label: "Create New Pokemon" }
] as const;

export function HomeMenu() {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedHref = useMemo(() => MENU_ITEMS[selectedIndex]?.href ?? "/battle", [selectedIndex]);

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
        router.push(selectedHref);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, selectedHref]);

  return (
    <nav className="home-menu" aria-label="Home actions">
      {MENU_ITEMS.map((item, index) => (
        <Link
          key={item.href}
          href={item.href}
          className={`home-menu-button${selectedIndex === index ? " is-selected" : ""}`}
          onMouseEnter={() => setSelectedIndex(index)}
          onFocus={() => setSelectedIndex(index)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
