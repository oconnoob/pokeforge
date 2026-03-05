import { redirect } from "next/navigation";
import { GenerateForm } from "@/components/generate-form";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main>
      <h1>Generate Pokemon</h1>
      <p>
        Describe a Pokemon in natural language. The app uses Codex to generate balanced stats/behavior and OpenAI to generate
        front/back 64x64 sprites.
      </p>
      <div className="card">
        <p>Logged in as: {user.email}</p>
      </div>
      <GenerateForm />
    </main>
  );
}
