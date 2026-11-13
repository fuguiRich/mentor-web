import { createFileRoute } from "@tanstack/react-router";
import { MentorDashboardPage } from "../features/mentor/MentorDashboardPage";

export const Route = createFileRoute("/_app/mentor/")({
  component: MentorDashboardPage,
});
