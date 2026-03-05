import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function BattlePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main>
      <h1>Battle Arena</h1>
      <p>Authenticated route placeholder for the 1v1 battle interface.</p>
      <div className="card">
        <p>Logged in as: {user.email}</p>
      </div>
    </main>
  );
}
