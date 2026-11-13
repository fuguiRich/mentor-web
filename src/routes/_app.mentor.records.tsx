import { createFileRoute } from "@tanstack/react-router";
import { MentorRecordsPage } from "../features/mentor/MentorRecordsPage";
import { mentorRecordSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/mentor/records")({
  validateSearch: (search) => mentorRecordSearchSchema.parse(search),
  component: MentorRecordsPage,
});
