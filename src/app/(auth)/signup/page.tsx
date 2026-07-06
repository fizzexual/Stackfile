import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { enabledOAuthProviders } from "@/lib/auth/providers";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  const providers = enabledOAuthProviders();
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Create your Stackfile</h1>
        <p className="text-sm text-muted">Start storing in seconds</p>
      </div>
      <OAuthButtons providers={providers} />
      <SignupForm />
    </div>
  );
}
