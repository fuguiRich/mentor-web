import { createFileRoute } from "@tanstack/react-router";
import { MentorReviewsPage } from "../features/mentor/MentorReviewsPage";
import { listSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/mentor/reviews")({
  validateSearch: (search) => listSearchSchema.parse(search),
  component: MentorReviewsPage,
});
