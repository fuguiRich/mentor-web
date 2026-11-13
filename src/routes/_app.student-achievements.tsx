import { createFileRoute } from "@tanstack/react-router";
import { StudentAchievementsPage } from "../features/student-achievements/StudentAchievementsPage";
import { studentAchievementSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/student-achievements")({
  validateSearch: (search) => studentAchievementSearchSchema.parse(search),
  component: StudentAchievementsPage,
});
