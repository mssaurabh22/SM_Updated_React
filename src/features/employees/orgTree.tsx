import { useNavigate } from "react-router-dom";
import { Avatar, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import type { Employee } from "../../api/employeesApi";

export interface OrgNode {
  employee: Employee;
  children: OrgNode[];
}

/** Groups employees by managerId into a forest (usually one tree per org, but more than one
 * root is possible - e.g. two Admins, neither reporting to the other). An employee whose
 * managerId points at someone not in this list (shouldn't happen, but data can be messy) is
 * treated as a root too, rather than silently dropped. Shared by OrgChartPage (every root, ADMIN
 * only) and MyTeamPage (just the caller's own subtree, any employee). */
export function buildForest(employees: Employee[]): OrgNode[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const childrenByManager = new Map<string, Employee[]>();
  const roots: Employee[] = [];

  for (const employee of employees) {
    if (employee.managerId && byId.has(employee.managerId)) {
      const siblings = childrenByManager.get(employee.managerId) ?? [];
      siblings.push(employee);
      childrenByManager.set(employee.managerId, siblings);
    } else {
      roots.push(employee);
    }
  }

  function toNode(employee: Employee): OrgNode {
    const children = (childrenByManager.get(employee.id) ?? [])
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    return { employee, children: children.map(toNode) };
  }

  return roots
    .slice()
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map(toNode);
}

/** Finds the node for a specific employee anywhere in a forest - used by MyTeamPage to pull
 * out just the caller's own subtree instead of showing every root. */
export function findNode(forest: OrgNode[], employeeId: string): OrgNode | null {
  for (const node of forest) {
    if (node.employee.id === employeeId) return node;
    const found = findNode(node.children, employeeId);
    if (found) return found;
  }
  return null;
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

interface OrgChartNodeProps {
  node: OrgNode;
  designationLabelById: Map<string, string>;
  isLast: boolean;
  /** Visually distinguishes "you" at the root of MyTeamPage's tree - unused (default false) on
   * OrgChartPage, which has no single "current viewer" to highlight. */
  highlight?: boolean;
}

export function OrgChartNode({ node, designationLabelById, isLast, highlight = false }: OrgChartNodeProps) {
  const navigate = useNavigate();
  const { employee, children } = node;
  const designationLabel = employee.designationId
    ? (designationLabelById.get(employee.designationId) ?? null)
    : null;

  return (
    <Stack direction="row" spacing={1.5}>
      <Stack sx={{ alignItems: "center" }}>
        <Avatar sx={{ width: 40, height: 40, bgcolor: "primary.main" }}>
          {initials(employee.fullName) || <PersonIcon fontSize="small" />}
        </Avatar>
        {children.length > 0 && <Box sx={{ width: "2px", flexGrow: 1, bgcolor: "divider", my: 0.5 }} />}
      </Stack>
      <Box sx={{ pb: isLast && children.length === 0 ? 0 : 2.5, minWidth: 0, flexGrow: 1 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            cursor: "pointer",
            display: "inline-block",
            ...(highlight && { borderColor: "primary.main", borderWidth: 2 }),
          }}
          onClick={() => navigate("/app/employees")}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="subtitle2">
              {employee.fullName}
              {highlight ? " (You)" : ""}
            </Typography>
            <Chip
              label={employee.role}
              size="small"
              color={employee.role === "ADMIN" ? "primary" : "default"}
              variant="outlined"
            />
            {!employee.active && <Chip label="Inactive" size="small" color="default" />}
          </Stack>
          {designationLabel && (
            <Typography variant="caption" color="text.secondary">
              {designationLabel}
            </Typography>
          )}
        </Paper>

        {children.length > 0 && (
          <Stack spacing={0} sx={{ mt: 2 }}>
            {children.map((child, index) => (
              <OrgChartNode
                key={child.employee.id}
                node={child}
                designationLabelById={designationLabelById}
                isLast={index === children.length - 1}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
