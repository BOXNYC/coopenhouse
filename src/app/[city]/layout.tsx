import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CityMemory } from "@/components/CityMemory";
import { CITY_KEYS, isCityKey } from "@/lib/cities";

export function generateStaticParams() {
  return CITY_KEYS.map((city) => ({ city }));
}

async function ValidCity({ params }: { params: LayoutProps<"/[city]">["params"] }) {
  const { city } = await params;
  if (!isCityKey(city)) notFound();
  return <CityMemory city={city} />;
}

export default function CityLayout({ children, params }: LayoutProps<"/[city]">) {
  return (
    <>
      <Suspense fallback={null}>
        <ValidCity params={params} />
      </Suspense>
      {children}
    </>
  );
}
