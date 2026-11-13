import { createFileRoute } from "@tanstack/react-router";
import { ConfigsPage } from "../features/system/ConfigsPage";
import { systemConfigSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/system/configs")({
  validateSearch: (search) => systemConfigSearchSchema.parse(search),
  component: ConfigsPage,
});
