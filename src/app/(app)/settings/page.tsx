import { Suspense } from "react";
import type { Metadata } from "next";
import { getHousehold } from "@/lib/household";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { InstallApp } from "@/components/pwa/install-app";
import { ThemePicker } from "@/components/theme-picker";
import { pushConfigured } from "@/lib/push";
import { PushSettings } from "./push-settings";
import { RemindersForm } from "./reminders-form";

export const metadata: Metadata = { title: "Settings" };

async function Profile() {
  const { me } = await getHousehold();
  return <ProfileForm profile={me} />;
}

async function Reminders() {
  const { me } = await getHousehold();
  return <RemindersForm profile={me} />;
}

async function Notifications() {
  const { me } = await getHousehold();
  return <PushSettings enabled={me.push_notifications} serverReady={pushConfigured()} />;
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="bg-muted h-48 animate-pulse rounded" />}>
            <Profile />
          </Suspense>
        </CardContent>
      </Card>
      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle>App</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ThemePicker />
          <InstallApp />
        </CardContent>
      </Card>
      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="bg-muted h-32 animate-pulse rounded" />}>
            <Notifications />
          </Suspense>
        </CardContent>
      </Card>
      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle>Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded" />}>
            <Reminders />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}
