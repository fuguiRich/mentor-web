import { createFileRoute } from "@tanstack/react-router";
import { ApplicationsPage } from "../features/applications/ApplicationsPage";
import { listSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/applications/")({
  validateSearch: (search) => listSearchSchema.parse(search),
  component: ApplicationsPage,
});
