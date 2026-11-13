import type { Dept } from "./api/types";

export interface TreeOption {
  label: string;
  value: string;
}

/** 部门树 → 带缩进的下拉选项。 */
export function flattenDepts(
  nodes: Dept[],
  depth = 0,
  result: TreeOption[] = [],
): TreeOption[] {
  for (const node of nodes) {
    result.push({
      value: node.id,
      label: `${"　".repeat(depth)}${node.name}`,
    });
    if (node.children?.length) {
      flattenDepts(node.children, depth + 1, result);
    }
  }
  return result;
}

/** 取部门树中所有 id（用于按部门筛选时包含下级）。 */
export function deptIds(nodes: Dept[], result: string[] = []): string[] {
  for (const node of nodes) {
    result.push(node.id);
    if (node.children?.length) deptIds(node.children, result);
  }
  return result;
}
