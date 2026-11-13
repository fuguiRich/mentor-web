import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "../features/system/UsersPage";
import { systemUserSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/system/users")({
  validateSearch: (search) => systemUserSearchSchema.parse(search),
  component: UsersPage,
});
