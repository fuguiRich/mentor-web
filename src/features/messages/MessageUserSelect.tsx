import { useDeferredValue, useState } from "react";
import { Select } from "antd";
import { useQuery } from "@tanstack/react-query";
import { listUsers } from "../../lib/api/endpoints/system";

export interface MessageUserOption {
  value: string;
  label: string;
}

/** 指定收件人选择器：按姓名搜索启用账号；仅具备 user:list 的管理员使用。 */
export function MessageUserSelect({
  value,
  onChange,
}: {
  value: MessageUserOption[];
  onChange: (next: MessageUserOption[]) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword.trim());

  const query = useQuery({
    queryKey: ["messages", "recipient-users", deferredKeyword],
    queryFn: () =>
      listUsers({
        page: 1,
        pageSize: 20,
        realName: deferredKeyword || undefined,
        status: 1,
      }),
    staleTime: 30_000,
  });

  const options = (query.data?.list ?? []).map((user) => ({
    value: user.id,
    label: `${user.realName}（${user.username}）`,
  }));

  // 搜索词变化后，已选用户可能不在当前结果里；保留其标签，避免只显示 ID。
  const merged = [
    ...value,
    ...options.filter(
      (option) => !value.some((selected) => selected.value === option.value),
    ),
  ];

  return (
    <Select
      mode="multiple"
      labelInValue
      value={value}
      options={merged}
      onChange={(next) =>
        onChange(
          next.map((item) => ({
            value: item.value,
            label: String(item.label),
          })),
        )
      }
      onSearch={setKeyword}
      filterOption={false}
      placeholder="输入姓名搜索用户"
      loading={query.isFetching}
      notFoundContent={query.isFetching ? "搜索中…" : "未找到用户"}
      maxTagCount="responsive"
      style={{ width: "100%" }}
    />
  );
}
