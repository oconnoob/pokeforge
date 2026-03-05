import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignUpPage() {
  return (
    <main>
      <h1>Sign Up</h1>
      <AuthForm mode="signup" />
      <p>
        Already registered? <Link href="/auth/login">Login</Link>
      </p>
    </main>
  );
}
