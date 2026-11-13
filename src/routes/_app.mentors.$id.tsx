import { createFileRoute } from "@tanstack/react-router";
import { MentorDetailPage } from "../features/mentors/MentorDetailPage";

export const Route = createFileRoute("/_app/mentors/$id")({
  component: MentorDetailPage,
});
