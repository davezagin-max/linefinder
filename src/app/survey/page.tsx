import type { Metadata } from "next";
import { Survey } from "@/components/survey/Survey";

export const metadata: Metadata = {
  title: "Find your setup",
  description: "A quick, fun survey to match you with skis or a snowboard, bindings and boots.",
};

export default function SurveyPage() {
  return <Survey />;
}
