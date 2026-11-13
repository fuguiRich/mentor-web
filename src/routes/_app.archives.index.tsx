import { createFileRoute } from "@tanstack/react-router";
import { ArchivesPage } from "../features/archives/ArchivesPage";
import { archiveSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/archives/")({
  validateSearch: (search) => archiveSearchSchema.parse(search),
  component: ArchivesPage,
});
