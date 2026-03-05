import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/battle", label: "Battle" },
  { href: "/generate", label: "Generate" },
  { href: "/admin", label: "Admin" },
  { href: "/auth/login", label: "Login" },
  { href: "/auth/signup", label: "Sign Up" }
] as const;

export function SiteNav() {
  return (
    <header className="site-nav-wrap">
      <nav className="site-nav" aria-label="Main">
        <span className="site-nav-title">PokeForge</span>
        <ul className="site-nav-links">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
