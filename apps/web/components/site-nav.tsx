import Link from "next/link";
import { isAdminUser, parseAdminEmails } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/config/env";

const BASE_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/battle", label: "Battle" },
  { href: "/generate", label: "Generate" },
  { href: "/auth/login", label: "Login" },
  { href: "/auth/signup", label: "Sign Up" }
] as const;

const ADMIN_LINK = { href: "/admin", label: "Admin" } as const;

export async function SiteNav() {
  const user = await getCurrentUser();
  const { ADMIN_EMAILS } = getEnv();
  const adminEmails = parseAdminEmails(ADMIN_EMAILS);
  const canSeeAdmin = Boolean(user && isAdminUser(user, adminEmails));
  const navLinks = canSeeAdmin ? [...BASE_NAV_LINKS, ADMIN_LINK] : BASE_NAV_LINKS;

  return (
    <header className="site-nav-wrap">
      <nav className="site-nav" aria-label="Main">
        <span className="site-nav-title">PokeForge</span>
        <ul className="site-nav-links">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
