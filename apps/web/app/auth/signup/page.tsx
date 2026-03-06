import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <section className="auth-stage">
        <div className="auth-stage-backdrop" aria-hidden="true" />
        <div className="auth-stage-content">
          <h1 className="auth-title">Create Account</h1>
          <section className="create-form-panel auth-panel">
            <AuthForm mode="signup" />
            <p className="auth-switch">
              Already registered? <Link href="/auth/login">Login</Link>
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
