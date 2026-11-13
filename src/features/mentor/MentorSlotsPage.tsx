import { useEffect, useState } from "react";
import { App, Button, Card, Empty, Input, Modal, Select, Tag } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { FormField } from "../../components/FormField";
import { CompactEmpty } from "../../components/CompactEmpty";
import { QueryErrorState } from "../../components/ErrorState";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import type { TimeSlot } from "../../lib/api/types";
import {
  useCreateSlot,
  useDeleteSlot,
  useMyMentorProfile,
  useSlots,
  useUpdateSlot,
} from "./queries";

const WEEKDAYS = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 7, label: "周日" },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    startTime: z
      .string()
      .regex(TIME_PATTERN, "开始时间格式应为 HH:mm"),
    endTime: z.string().regex(TIME_PATTERN, "结束时间格式应为 HH:mm"),
    status: z.number().int().min(0).max(1),
  })
  .refine((values) => values.endTime > values.startTime, {
    path: ["endTime"],
    message: "结束时间必须晚于开始时间",
  });

type FormValues = z.infer<typeof schema>;

export function MentorSlotsPage() {
  const { message, modal } = App.useApp();
  const profile = useMyMentorProfile();
  const query = useSlots(Boolean(profile.data));
  const createMutation = useCreateSlot();
  const updateMutation = useUpdateSlot();
  const deleteMutation = useDeleteSlot();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TimeSlot | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { weekday: 1, startTime: "09:00", endTime: "11:00", status: 1 },
  });

  useEffect(() => {
    if (!formOpen) return;
    form.reset(
      editing
        ? {
            weekday: editing.weekday,
            startTime: editing.startTime,
            endTime: editing.endTime,
            status: editing.status,
          }
        : {
            weekday: 1,
            startTime: "09:00",
            endTime: "11:00",
            status: 1,
          },
    );
  }, [formOpen, editing, form]);

  async function submit(values: FormValues) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          body: {
            weekday: values.weekday,
            startTime: values.startTime,
            endTime: values.endTime,
            status: values.status,
          },
        });
        message.success("时段已更新");
      } else {
        await createMutation.mutateAsync({
          weekday: values.weekday,
          startTime: values.startTime,
          endTime: values.endTime,
          status: values.status,
        });
        message.success("时段已新增");
      }
      setFormOpen(false);
      setEditing(null);
      void query.refetch();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "保存失败，请稍后重试",
        );
      }
    }
  }

  async function toggleStatus(slot: TimeSlot) {
    const next = slot.status === 1 ? 0 : 1;
    try {
      await updateMutation.mutateAsync({
        id: slot.id,
        body: {
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: next,
        },
      });
      message.success(next === 1 ? "时段已开放" : "时段已关闭");
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "操作失败，请稍后重试",
      );
    }
  }

  function confirmDelete(slot: TimeSlot) {
    modal.confirm({
      title: "删除时段",
      content: `确认删除 ${WEEKDAYS.find((day) => day.value === slot.weekday)?.label ?? ""} ${slot.startTime}-${slot.endTime}？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(slot.id);
          message.success("时段已删除");
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "删除失败，请稍后重试",
          );
          throw error;
        }
      },
    });
  }

  if (profile.isLoading) {
    return <Card loading />;
  }

  if (profile.isError) {
    return (
      <QueryErrorState
        error={profile.error}
        onRetry={() => void profile.refetch()}
      />
    );
  }

  if (!profile.data) {
    return (
      <div>
        <PageHeader title="可指导时段" />
        <Card>
          <CompactEmpty
            text="尚未建立导师档案，暂时不能设置可指导时段"
            action={
              <Link to="/mentor/profile" className="text-sm">
                去建档
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const sorted = [...(query.data?.list ?? [])].sort(
    (a, b) =>
      a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
  );

  return (
    <div>
      <PageHeader
        title="可指导时段"
        description="按周设置固定开放时段；同一星期内时段不能重叠，边界相接不算重叠。"
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              新增时段
            </Button>
          </>
        }
      />

      <Card>
        {query.isError ? (
          <QueryErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <DataTable<TimeSlot>
            dataSource={sorted}
            loading={query.isLoading}
            pagination={false}
            wrapped={false}
            columns={[
              {
                title: "星期",
                dataIndex: "weekday",
                key: "weekday",
                width: 100,
                render: (value: number) =>
                  WEEKDAYS.find((day) => day.value === value)?.label ??
                  `周${value}`,
              },
              {
                title: "开始",
                dataIndex: "startTime",
                key: "startTime",
                width: 100,
                render: (value: string) => (
                  <span className="tabular">{value}</span>
                ),
              },
              {
                title: "结束",
                dataIndex: "endTime",
                key: "endTime",
                width: 100,
                render: (value: string) => (
                  <span className="tabular">{value}</span>
                ),
              },
              {
                title: "状态",
                dataIndex: "status",
                key: "status",
                width: 100,
                render: (value: number) => (
                  <Tag
                    color={value === 1 ? "success" : "default"}
                    className="m-0"
                  >
                    {value === 1 ? "开放" : "关闭"}
                  </Tag>
                ),
              },
              {
                title: "操作",
                key: "actions",
                width: 220,
                render: (_, slot) => (
                  <div className="table-actions">
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setEditing(slot);
                        setFormOpen(true);
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => void toggleStatus(slot)}
                    >
                      {slot.status === 1 ? "关闭" : "开放"}
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => confirmDelete(slot)}
                    >
                      删除
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyText={
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无开放时段，学生暂时无法预约"
              />
            }
          />
        )}
      </Card>

      <Modal
        open={formOpen}
        title={editing ? "编辑可指导时段" : "新增可指导时段"}
        onCancel={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        okText="保存"
        cancelText="取消"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onOk={() => void form.handleSubmit(submit)()}
        destroyOnHidden
      >
        <FormField
          control={form.control}
          name="weekday"
          label="星期"
          required
        >
          {(field) => (
            <Select
              value={Number(field.value)}
              onChange={field.onChange}
              options={WEEKDAYS}
              style={{ width: "100%" }}
            />
          )}
        </FormField>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startTime"
            label="开始时间"
            required
          >
            {(field) => (
              <Input
                type="time"
                value={field.value ?? ""}
                onChange={(event) => field.onChange(event.target.value)}
              />
            )}
          </FormField>
          <FormField
            control={form.control}
            name="endTime"
            label="结束时间"
            required
          >
            {(field) => (
              <Input
                type="time"
                value={field.value ?? ""}
                onChange={(event) => field.onChange(event.target.value)}
              />
            )}
          </FormField>
        </div>
        <FormField control={form.control} name="status" label="状态" required>
          {(field) => (
            <Select
              value={Number(field.value)}
              onChange={field.onChange}
              options={[
                { value: 1, label: "开放" },
                { value: 0, label: "关闭" },
              ]}
              style={{ width: "100%" }}
            />
          )}
        </FormField>
      </Modal>
    </div>
  );
}
