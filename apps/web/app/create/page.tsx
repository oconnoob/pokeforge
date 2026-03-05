import Link from "next/link";
import { GenerateForm } from "@/components/generate-form";
import { requireCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  await requireCurrentUser();

  return (
    <main className="create-page">
      <section className="create-stage">
        <div className="create-stage-backdrop" aria-hidden="true" />
        <div className="create-stage-content">
          <Link href="/" className="create-back-link">
            {"< Back to Main Menu"}
          </Link>
          <h1 className="create-title">Create a Pokemon</h1>
          <GenerateForm />
        </div>
      </section>
    </main>
  );
}
