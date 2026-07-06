import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Create your Stackfile</h1>
        <p className="text-sm text-neutral-400">Start storing in seconds</p>
      </div>
      <SignupForm />
    </div>
  );
}
