import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnreadCount,
  listMessages,
  listSentMessages,
  markAllRead,
  markMessageRead,
  sendMessage,
} from "../../lib/api/endpoints/messages";
import type { MessageList, MessageQuery, SendMessageBody } from "../../lib/api/types";

/** 消息列表轮询间隔：收发后 5 秒内可见。 */
export const MESSAGE_POLL_INTERVAL = 5_000;

/**
 * 未读角标轮询间隔。
 *
 * 角标在 AppShell 中全局挂载，5 秒轮询会产生不必要的全局请求；这里放宽到
 * 30 秒。消息页自己的列表仍按 5 秒刷新，标记已读 / 发送后也会立即刷新角标。
 */
export const MESSAGE_UNREAD_POLL_INTERVAL = 30_000;

export const MESSAGE_UNREAD_KEY = ["messages", "unread-count"] as const;

export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: MESSAGE_UNREAD_KEY,
    queryFn: getUnreadCount,
    enabled,
    staleTime: 15_000,
    refetchInterval: MESSAGE_UNREAD_POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });
}

export function useMessages(params: MessageQuery) {
  return useQuery({
    queryKey: ["messages", "list", params],
    queryFn: () => listMessages(params),
    refetchInterval: MESSAGE_POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });
}

export function useSentMessages(params: MessageQuery, enabled = true) {
  return useQuery({
    queryKey: ["messages", "sent", params],
    queryFn: () => listSentMessages(params),
    enabled,
    refetchInterval: MESSAGE_POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markMessageRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["messages"] });
      const previousLists = queryClient.getQueriesData<MessageList>({
        queryKey: ["messages", "list"],
      });
      const previousUnread =
        queryClient.getQueryData<{ unread: number }>(MESSAGE_UNREAD_KEY);

      const wasUnread = previousLists.some(([, data]) =>
        data?.list.some((item) => item.id === id && !item.readAt),
      );
      if (wasUnread) {
        const readAt = new Date().toISOString();
        queryClient.setQueriesData<MessageList>(
          { queryKey: ["messages", "list"] },
          (old) =>
            old
              ? {
                  ...old,
                  unread: Math.max(0, old.unread - 1),
                  list: old.list.map((item) =>
                    item.id === id && !item.readAt
                      ? { ...item, readAt }
                      : item,
                  ),
                }
              : old,
        );
        queryClient.setQueryData<{ unread: number }>(MESSAGE_UNREAD_KEY, (old) =>
          old ? { unread: Math.max(0, old.unread - 1) } : old,
        );
      }

      return { previousLists, previousUnread };
    },
    onError: (_error, _id, context) => {
      if (!context) return;
      for (const [key, data] of context.previousLists) {
        queryClient.setQueryData(key, data);
      }
      if (context.previousUnread !== undefined) {
        queryClient.setQueryData(MESSAGE_UNREAD_KEY, context.previousUnread);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["messages"] });
      const previousLists = queryClient.getQueriesData<MessageList>({
        queryKey: ["messages", "list"],
      });
      const previousUnread =
        queryClient.getQueryData<{ unread: number }>(MESSAGE_UNREAD_KEY);

      const readAt = new Date().toISOString();
      queryClient.setQueriesData<MessageList>(
        { queryKey: ["messages", "list"] },
        (old) =>
          old
            ? {
                ...old,
                unread: 0,
                list: old.list.map((item) =>
                  item.readAt ? item : { ...item, readAt },
                ),
              }
            : old,
      );
      queryClient.setQueryData<{ unread: number }>(MESSAGE_UNREAD_KEY, { unread: 0 });

      return { previousLists, previousUnread };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      for (const [key, data] of context.previousLists) {
        queryClient.setQueryData(key, data);
      }
      if (context.previousUnread !== undefined) {
        queryClient.setQueryData(MESSAGE_UNREAD_KEY, context.previousUnread);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SendMessageBody) => sendMessage(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}
