import { requireCurrentUser } from "@/lib/auth/session";
import { HomeMenu } from "@/components/home-menu";
import { HomeLogoutButton } from "@/components/home-logout-button";

export default async function HomePage() {
  await requireCurrentUser();

  return (
    <main className="home-screen">
      <section className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />
        <div className="home-stage-content">
          <h1 className="home-title">PokeForge</h1>
          <p className="home-tagline">Build your roster. Battle for glory. Become a legend.</p>
          <HomeMenu />
        </div>
        <HomeLogoutButton />
      </section>
    </main>
  );
}
