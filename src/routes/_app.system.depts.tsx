import { createFileRoute } from "@tanstack/react-router";
import { DeptsPage } from "../features/system/DeptsPage";

export const Route = createFileRoute("/_app/system/depts")({
  component: DeptsPage,
});
