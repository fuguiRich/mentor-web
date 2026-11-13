import { createFileRoute } from "@tanstack/react-router";
import { MentorSlotsPage } from "../features/mentor/MentorSlotsPage";

export const Route = createFileRoute("/_app/mentor/slots")({
  component: MentorSlotsPage,
});
