import { createFileRoute } from "@tanstack/react-router";
import { RulesPage } from "../features/assessments/RulesPage";

export const Route = createFileRoute("/_app/assessments/rules")({
  component: RulesPage,
});
