import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>PokeForge</h1>
      <p>Build and battle custom Pokemon.</p>
      <div className="card">
        <ul>
          <li>
            <Link href="/auth/login">Login</Link>
          </li>
          <li>
            <Link href="/auth/signup">Sign Up</Link>
          </li>
          <li>
            <Link href="/library">Pokemon Library</Link>
          </li>
          <li>
            <Link href="/generate">Generate Pokemon</Link>
          </li>
          <li>
            <Link href="/battle">Start Battle</Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
