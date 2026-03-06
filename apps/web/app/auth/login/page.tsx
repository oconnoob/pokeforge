import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-stage">
        <div className="auth-stage-backdrop" aria-hidden="true" />
        <div className="auth-stage-content">
          <h1 className="auth-title">Sign In</h1>
          <section className="create-form-panel auth-panel">
            <AuthForm mode="login" />
            <p className="auth-switch">
              Need an account? <Link href="/auth/signup">Sign up</Link>
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
