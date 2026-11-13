import { createFileRoute } from "@tanstack/react-router";
import { ApplicationDetailPage } from "../features/applications/ApplicationDetailPage";

export const Route = createFileRoute("/_app/applications/$id")({
  component: ApplicationDetailPage,
});
