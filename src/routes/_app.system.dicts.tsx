import { createFileRoute } from "@tanstack/react-router";
import { DictsPage } from "../features/system/DictsPage";
import { systemDictSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/system/dicts")({
  validateSearch: (search) => systemDictSearchSchema.parse(search),
  component: DictsPage,
});
