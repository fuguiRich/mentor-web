import { createFileRoute } from "@tanstack/react-router";
import { MentorProfilePage } from "../features/mentor/MentorProfilePage";

export const Route = createFileRoute("/_app/mentor/profile")({
  component: MentorProfilePage,
});
