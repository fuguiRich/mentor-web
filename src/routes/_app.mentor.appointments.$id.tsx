import { createFileRoute } from "@tanstack/react-router";
import { MentorAppointmentDetailPage } from "../features/mentor/MentorAppointmentDetailPage";

export const Route = createFileRoute("/_app/mentor/appointments/$id")({
  component: MentorAppointmentDetailPage,
});
