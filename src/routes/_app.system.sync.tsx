import { createFileRoute } from "@tanstack/react-router";
import { SyncSchedulePage } from "../features/system/SyncSchedulePage";
import { syncSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/system/sync")({
  validateSearch: (search) => syncSearchSchema.parse(search),
  component: SyncSchedulePage,
});
