import { createFileRoute } from "@tanstack/react-router";
import { AssessmentsPage } from "../features/assessments/AssessmentsPage";
import { assessmentSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/assessments/")({
  validateSearch: (search) => assessmentSearchSchema.parse(search),
  component: AssessmentsPage,
});
