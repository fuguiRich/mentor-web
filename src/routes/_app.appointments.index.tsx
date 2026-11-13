import { createFileRoute } from "@tanstack/react-router";
import { AppointmentsPage } from "../features/appointments/AppointmentsPage";
import { listSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/appointments/")({
  validateSearch: (search) => listSearchSchema.parse(search),
  component: AppointmentsPage,
});
