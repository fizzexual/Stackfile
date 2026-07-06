import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { enabledOAuthProviders } from "@/lib/auth/providers";
import { ProfileSection } from "@/components/settings/profile-section";
import { PasswordSection } from "@/components/settings/password-section";
import { TwoFactorSection } from "@/components/settings/two-factor-section";
import { WebdavSection } from "@/components/settings/webdav-section";
import { ConnectedAccounts } from "@/components/settings/connected-accounts";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const linkedRows = await db.query.accounts.findMany({
    where: and(eq(accounts.userId, user.id), ne(accounts.providerId, "credential")),
    columns: { providerId: true },
  });
  const providers = enabledOAuthProviders();

  return (
    <div className="scroll-thin h-full overflow-auto">
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-lg font-semibold">Settings</h1>
          <p className="text-sm text-dim">Manage your account &amp; security</p>
        </div>
        <ProfileSection name={user.name} email={user.email} />
        <PasswordSection />
        <TwoFactorSection enabled={user.twoFactorEnabled} />
        <WebdavSection
          email={user.email}
          configured={Boolean(user.webdavToken)}
        />
        <ConnectedAccounts
          providers={providers}
          linked={linkedRows.map((l) => l.providerId)}
        />
      </div>
    </div>
  );
}
