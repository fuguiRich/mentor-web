import { createFileRoute } from "@tanstack/react-router";
import { PermissionsPage } from "../features/system/PermissionsPage";

export const Route = createFileRoute("/_app/system/permissions")({
  component: PermissionsPage,
});
