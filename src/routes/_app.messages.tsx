import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "../features/messages/MessagesPage";
import { messageSearchSchema } from "../lib/list-search";

export const Route = createFileRoute("/_app/messages")({
  validateSearch: (search) => messageSearchSchema.parse(search),
  component: MessagesPage,
});
