import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getHousehold } from "@/lib/household";
import { getFoods } from "@/lib/diet";
import { MyFoods } from "./my-foods";

export const metadata: Metadata = { title: "My foods" };

async function List() {
  const [{ me }, foods] = await Promise.all([getHousehold(), getFoods()]);
  return <MyFoods foods={foods.filter((f) => f.owner_id === me.id)} />;
}

export default function MyFoodsPage() {
  return (
    <>
      <PageHeader
        title="My foods"
        description="Foods you add yourself, like a home recipe or a protein powder from its label."
      />
      <Suspense fallback={<div className="bg-muted h-48 max-w-lg animate-pulse rounded-xl" />}>
        <List />
      </Suspense>
    </>
  );
}
