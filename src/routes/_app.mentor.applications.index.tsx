import { createFileRoute } from "@tanstack/react-router";
import { MentorApplicationsPage } from "../features/mentor/MentorApplicationsPage";
import { listSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/mentor/applications/")({
  validateSearch: (search) => listSearchSchema.parse(search),
  component: MentorApplicationsPage,
});
