import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { AttendanceRecord, ExpenseClaim, Holiday, LeaveBalance, LeaveRequest, Payslip } from "../api/types";

/** The personal data every role sees about themselves, regardless of what else their dashboard shows. */
export function usePersonalData() {
  const attendance = useQuery({ queryKey: ["attendance", "me"], queryFn: async () => (await api.get<AttendanceRecord[]>("/attendance/me")).data });
  const balances = useQuery({ queryKey: ["leave-balances"], queryFn: async () => (await api.get<LeaveBalance[]>("/leave-requests/me/balance")).data });
  const leaveRequests = useQuery({ queryKey: ["leave-requests", "me"], queryFn: async () => (await api.get<LeaveRequest[]>("/leave-requests/me")).data });
  const expenses = useQuery({ queryKey: ["expenses", "me"], queryFn: async () => (await api.get<ExpenseClaim[]>("/expenses/me")).data });
  const payslips = useQuery({ queryKey: ["payslips", "me"], queryFn: async () => (await api.get<Payslip[]>("/payroll/payslips/me")).data });
  const holidays = useQuery({ queryKey: ["holidays"], queryFn: async () => (await api.get<Holiday[]>(`/holidays?year=${new Date().getFullYear()}`)).data });

  return { attendance, balances, leaveRequests, expenses, payslips, holidays };
}
