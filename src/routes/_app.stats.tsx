import { createFileRoute } from "@tanstack/react-router";
import { StatsPage } from "../features/stats/StatsPage";
import { statsSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/stats")({
  validateSearch: (search) => statsSearchSchema.parse(search),
  component: StatsPage,
});
