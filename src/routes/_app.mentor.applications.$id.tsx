import { createFileRoute } from "@tanstack/react-router";
import { MentorApplicationDetailPage } from "../features/mentor/MentorApplicationDetailPage";

export const Route = createFileRoute("/_app/mentor/applications/$id")({
  component: MentorApplicationDetailPage,
});
