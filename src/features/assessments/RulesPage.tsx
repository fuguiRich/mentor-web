import { useEffect, useState } from "react";
import { Alert, App, Button, Card, InputNumber, Skeleton } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "../../components/PageHeader";
import { FormField } from "../../components/FormField";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import { useAssessmentRules, useUpdateAssessmentRules } from "./queries";

const schema = z
  .object({
    review: z.number().min(0, "权重不能为负").max(1, "单项权重不能超过 1"),
    workload: z.number().min(0, "权重不能为负").max(1, "单项权重不能超过 1"),
    achievement: z.number().min(0, "权重不能为负").max(1, "单项权重不能超过 1"),
    workloadTarget: z.number().int().min(1, "目标值必须大于 0"),
    achievementTarget: z.number().int().min(1, "目标值必须大于 0"),
  })
  .superRefine((values, ctx) => {
    if (values.review + values.workload + values.achievement <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["review"],
        message: "三项权重之和必须大于 0",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export function RulesPage() {
  const { message } = App.useApp();
  const query = useAssessmentRules();
  const mutation = useUpdateAssessmentRules();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      review: 0.4,
      workload: 0.4,
      achievement: 0.2,
      workloadTarget: 10,
      achievementTarget: 5,
    },
  });

  useEffect(() => {
    if (!query.data) return;
    form.reset({
      review: query.data.weights.review,
      workload: query.data.weights.workload,
      achievement: query.data.weights.achievement,
      workloadTarget: query.data.targets.workload,
      achievementTarget: query.data.targets.achievement,
    });
  }, [query.data, form]);

  const sum =
    (form.watch("review") ?? 0) +
    (form.watch("workload") ?? 0) +
    (form.watch("achievement") ?? 0);

  async function submit(values: FormValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        weights: {
          review: values.review,
          workload: values.workload,
          achievement: values.achievement,
        },
        targets: {
          workload: values.workloadTarget,
          achievement: values.achievementTarget,
        },
      });
      message.success("考核评分规则已更新");
      void query.refetch();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "保存失败，请稍后重试",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PermissionGuard code="assessment:rule-manage">
      <PageHeader
        title="考核评分规则"
        description="配置学生评价、工作量、成果三项权重，以及工作量与成果满分对应的目标值。"
      />

      {query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : query.isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <form onSubmit={form.handleSubmit(submit)}>
          <Card title="指标权重">
            <Alert
              type={Math.abs(sum - 1) < 1e-9 ? "info" : "warning"}
              showIcon
              className="mb-5"
              title={
                Math.abs(sum - 1) < 1e-9
                  ? "三项权重之和为 1，将按原值使用。"
                  : `当前三项权重之和为 ${sum.toFixed(2)}，保存后系统会按比例归一化。`
              }
            />
            <div className="grid gap-x-6 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="review"
                label="学生评价权重"
                extra="0–1，例如 0.4 表示 40%"
              >
                {(field) => (
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.05}
                    precision={2}
                    value={field.value}
                    onChange={(value) => field.onChange(value ?? 0)}
                    style={{ width: "100%" }}
                  />
                )}
              </FormField>
              <FormField
                control={form.control}
                name="workload"
                label="指导工作量权重"
              >
                {(field) => (
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.05}
                    precision={2}
                    value={field.value}
                    onChange={(value) => field.onChange(value ?? 0)}
                    style={{ width: "100%" }}
                  />
                )}
              </FormField>
              <FormField
                control={form.control}
                name="achievement"
                label="双创成果权重"
              >
                {(field) => (
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.05}
                    precision={2}
                    value={field.value}
                    onChange={(value) => field.onChange(value ?? 0)}
                    style={{ width: "100%" }}
                  />
                )}
              </FormField>
            </div>
            <div className="text-sm text-ink-muted">
              当前合计：<span className="tabular">{sum.toFixed(2)}</span>
              {query.data?.weights.normalized ? (
                <span className="ml-2 text-warning">
                  （当前生效值为归一化后的{" "}
                  {(query.data.weights.review * 100).toFixed(1)}% /{" "}
                  {(query.data.weights.workload * 100).toFixed(1)}% /{" "}
                  {(query.data.weights.achievement * 100).toFixed(1)}%）
                </span>
              ) : null}
            </div>
          </Card>

          <Card title="目标值" className="mt-4">
            <p className="mt-0 mb-4 text-sm text-ink-muted">
              工作量与成果按「达到目标值即满分」折算；目标值必须大于 0。
            </p>
            <div className="grid gap-x-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="workloadTarget"
                label="工作量目标（次 / 学期）"
                required
              >
                {(field) => (
                  <InputNumber
                    min={1}
                    precision={0}
                    value={field.value}
                    onChange={(value) => field.onChange(value ?? 1)}
                    style={{ width: "100%" }}
                  />
                )}
              </FormField>
              <FormField
                control={form.control}
                name="achievementTarget"
                label="成果目标（项 / 学期）"
                required
              >
                {(field) => (
                  <InputNumber
                    min={1}
                    precision={0}
                    value={field.value}
                    onChange={(value) => field.onChange(value ?? 1)}
                    style={{ width: "100%" }}
                  />
                )}
              </FormField>
            </div>
          </Card>

          <div className="mt-4 flex items-center gap-3">
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存规则
            </Button>
            <Button onClick={() => void query.refetch()}>重置为当前生效值</Button>
            <span className="text-xs text-ink-muted">
              新规则只影响之后新建或提交初评的考核；已冻结的考核不受影响。
            </span>
          </div>
        </form>
      )}
    </PermissionGuard>
  );
}
