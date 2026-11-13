import { createFileRoute } from "@tanstack/react-router";
import { MentorAppointmentsPage } from "../features/mentor/MentorAppointmentsPage";
import { listSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/mentor/appointments/")({
  validateSearch: (search) => listSearchSchema.parse(search),
  component: MentorAppointmentsPage,
});
