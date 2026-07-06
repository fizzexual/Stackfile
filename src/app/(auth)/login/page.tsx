import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { enabledOAuthProviders } from "@/lib/auth/providers";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  const providers = enabledOAuthProviders();
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted">Sign in to your Stackfile</p>
      </div>
      <OAuthButtons providers={providers} />
      <LoginForm />
    </div>
  );
}
