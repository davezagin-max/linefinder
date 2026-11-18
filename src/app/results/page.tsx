import type { Metadata } from "next";
import { InterimResults } from "./InterimResults";

export const metadata: Metadata = { title: "Your picks" };

export default function ResultsPage() {
  return <InterimResults />;
}
