import { ComingSoon } from "@/components/ui/ComingSoon";

const NAMES: Record<string, string> = { skis: "Skis", snowboards: "Snowboards", bindings: "Bindings", boots: "Boots" };

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(NAMES).map((category) => ({ category }));
}

export default async function BrowsePage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return (
    <ComingSoon
      title={`No fresh tracks here yet`}
      body={`Browsing all ${NAMES[category]?.toLowerCase() ?? "gear"} is coming soon. Meanwhile, the quickest way to your setup is a 2-minute survey.`}
    />
  );
}
