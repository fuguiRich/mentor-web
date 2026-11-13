import { apiFetch } from "../client";
import type {
  Message,
  MessageList,
  MessageQuery,
  SendMessageBody,
  SendMessageResult,
  SentMessageList,
} from "../types";

export function listMessages(
  query: MessageQuery = {},
): Promise<MessageList> {
  return apiFetch<MessageList>("/messages", { query });
}

export function getUnreadCount(): Promise<{ unread: number }> {
  return apiFetch<{ unread: number }>("/messages/unread-count");
}

export function listSentMessages(
  query: MessageQuery = {},
): Promise<SentMessageList> {
  return apiFetch<SentMessageList>("/messages/sent", { query });
}

export function sendMessage(body: SendMessageBody): Promise<SendMessageResult> {
  return apiFetch<SendMessageResult>("/messages", { method: "POST", body });
}

export function markMessageRead(id: string): Promise<Message> {
  return apiFetch<Message>(`/messages/${id}/read`, { method: "PATCH" });
}

export function markAllRead(): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>("/messages/read-all", {
    method: "POST",
  });
}
