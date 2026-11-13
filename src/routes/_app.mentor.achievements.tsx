import { createFileRoute } from "@tanstack/react-router";
import { MentorAchievementsPage } from "../features/mentor/MentorAchievementsPage";
import { mentorAchievementSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/mentor/achievements")({
  validateSearch: (search) => mentorAchievementSearchSchema.parse(search),
  component: MentorAchievementsPage,
});
