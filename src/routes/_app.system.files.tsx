import { createFileRoute } from "@tanstack/react-router";
import { FilesPage } from "../features/system/FilesPage";
import { systemFileSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/system/files")({
  validateSearch: (search) => systemFileSearchSchema.parse(search),
  component: FilesPage,
});
