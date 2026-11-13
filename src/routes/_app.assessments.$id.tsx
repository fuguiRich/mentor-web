import { createFileRoute } from "@tanstack/react-router";
import { AssessmentDetailPage } from "../features/assessments/AssessmentDetailPage";

export const Route = createFileRoute("/_app/assessments/$id")({
  component: AssessmentDetailPage,
});
