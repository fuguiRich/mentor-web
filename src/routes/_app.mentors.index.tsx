import { createFileRoute } from "@tanstack/react-router";
import { MentorsPage } from "../features/mentors/MentorsPage";
import { mentorSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/mentors/")({
  validateSearch: (search) => mentorSearchSchema.parse(search),
  component: MentorsPage,
});
