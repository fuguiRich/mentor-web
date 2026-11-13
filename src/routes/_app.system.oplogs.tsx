import { createFileRoute } from "@tanstack/react-router";
import { OpLogsPage } from "../features/system/OpLogsPage";
import { systemOpLogSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/system/oplogs")({
  validateSearch: (search) => systemOpLogSearchSchema.parse(search),
  component: OpLogsPage,
});
