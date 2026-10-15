import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { getHousehold } from "@/lib/household";
import { getPhotos } from "@/lib/body-data";
import { todayIST } from "@/lib/dates";
import { Gallery } from "./gallery";

export const metadata: Metadata = { title: "Progress photos" };

async function Photos() {
  await connection();
  const { me } = await getHousehold();
  const photos = await getPhotos(me.id);
  return <Gallery userId={me.id} photos={photos} today={todayIST()} />;
}

export default function PhotosPage() {
  return (
    <>
      <PageHeader
        title="Progress photos"
        description="Private to you. Same spot, same light, same time of day makes the best comparisons."
      />
      <Suspense fallback={<div className="bg-muted h-64 max-w-2xl animate-pulse rounded-xl" />}>
        <Photos />
      </Suspense>
    </>
  );
}
