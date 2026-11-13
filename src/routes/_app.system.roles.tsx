import { createFileRoute } from "@tanstack/react-router";
import { RolesPage } from "../features/system/RolesPage";
import { systemRoleSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/system/roles")({
  validateSearch: (search) => systemRoleSearchSchema.parse(search),
  component: RolesPage,
});
