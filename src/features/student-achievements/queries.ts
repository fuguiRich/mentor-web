import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStudentAchievement,
  deleteStudentAchievement,
  linkStudentAchievement,
  listStudentAchievements,
  listStudentOptions,
} from "../../lib/api/endpoints/studentAchievements";
import { listAppointments } from "../../lib/api/endpoints/appointments";
import { searchMentors } from "../../lib/api/endpoints/mentors";
import type {
  CreateStudentAchievementBody,
  StudentAchievementQuery,
  StudentOption,
} from "../../lib/api/types";

export function useStudentAchievements(params: StudentAchievementQuery) {
  return useQuery({
    queryKey: ["student-achievements", "list", params],
    queryFn: () => listStudentAchievements(params),
  });
}

export function useCreateStudentAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStudentAchievementBody) =>
      createStudentAchievement(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["student-achievements"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      void queryClient.invalidateQueries({ queryKey: ["archives"] });
    },
  });
}

export function useLinkStudentAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      mentorProfileId,
    }: {
      id: string;
      mentorProfileId: string;
    }) => linkStudentAchievement(id, { mentorProfileId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["student-achievements"] });
      void queryClient.invalidateQueries({ queryKey: ["archives"] });
    },
  });
}

export function useDeleteStudentAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStudentAchievement(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["student-achievements"] });
      void queryClient.invalidateQueries({ queryKey: ["archives"] });
    },
  });
}

export { useMentorOptions } from "../../lib/hooks/useMentorOptions";

/**
 * 学生下拉选项：后端按姓名 / 学号搜索学生目录，数据范围由接口限制。
 * 管理员在登记成果和筛选时使用；导师 / 学生不会调用（enabled=false）。
 */
export function useStudentOptions(keyword?: string, enabled = true) {
  return useQuery({
    queryKey: ["students", "options", keyword ?? ""],
    queryFn: async (): Promise<{
      list: StudentOption[];
      total: number;
    }> => {
      const directory = await listStudentOptions({
        page: 1,
        pageSize: 50,
        keyword: keyword || undefined,
      });
      if (directory.total > 0) {
        return { list: directory.list, total: directory.total };
      }

      // 学生同步未开启时目录为空，回退到「有预约 / 有成果」的学生，保证现有数据可用。
      const [appointments, achievements] = await Promise.allSettled([
        listAppointments({ page: 1, pageSize: 100 }),
        listStudentAchievements({ page: 1, pageSize: 100 }),
      ]);
      const map = new Map<string, StudentOption>();
      if (appointments.status === "fulfilled") {
        for (const appointment of appointments.value.list) {
          const student = appointment.student;
          if (!student?.personId) continue;
          map.set(student.personId, {
            id: student.personId,
            login: student.login,
            realName: student.realName,
            deptId: null,
            deptName: student.orgUnitName ?? null,
            major: student.major ?? null,
            className: student.className ?? null,
          });
        }
      }
      if (achievements.status === "fulfilled") {
        for (const achievement of achievements.value.list) {
          if (map.has(achievement.studentPersonId)) continue;
          map.set(achievement.studentPersonId, {
            id: achievement.studentPersonId,
            login: `编号 ${achievement.studentPersonId}`,
            realName: achievement.studentName,
            deptId: null,
            deptName: null,
            major: null,
            className: null,
          });
        }
      }
      const needle = keyword?.trim();
      const list = [...map.values()]
        .filter(
          (student) =>
            !needle ||
            student.realName.includes(needle) ||
            student.login.includes(needle),
        )
        .sort((a, b) => a.realName.localeCompare(b.realName, "zh-CN"));
      return { list, total: list.length };
    },
    select: (data) =>
      data.list.map((student) => ({
        value: student.id,
        label: `${student.realName}（${student.login}${
          student.deptName ? ` · ${student.deptName}` : ""
        }）`,
      })),
    enabled,
    staleTime: 60_000,
  });
}

export function useMentorNameMap() {
  const query = useQuery({
    queryKey: ["mentors", "name-map"],
    queryFn: () => searchMentors({ page: 1, pageSize: 100 }),
    staleTime: 5 * 60_000,
  });
  const map = new Map<string, string>();
  for (const mentor of query.data?.list ?? []) {
    map.set(mentor.id, mentor.name);
  }
  return map;
}
