import { createFileRoute } from "@tanstack/react-router";
import { AppointmentDetailPage } from "../features/appointments/AppointmentDetailPage";

export const Route = createFileRoute("/_app/appointments/$id")({
  component: AppointmentDetailPage,
});
