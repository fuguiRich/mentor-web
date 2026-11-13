import { createFileRoute } from "@tanstack/react-router";
import { MentorStatsPage } from "../features/mentor/MentorStatsPage";
import { statsSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/mentor/stats")({
  validateSearch: (search) => statsSearchSchema.parse(search),
  component: MentorStatsPage,
});
