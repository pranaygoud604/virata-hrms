export type Role = "SUPER_ADMIN" | "HR_ADMIN" | "MANAGER" | "FINANCE" | "EMPLOYEE";

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  employeeId: string | null;
}

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Designation {
  id: string;
  title: string;
  departmentId: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  personalEmail: string | null;
  phone: string | null;
  departmentId: string;
  designationId: string;
  managerId: string | null;
  dateOfJoining: string;
  dateOfExit: string | null;
  status: "ACTIVE" | "ON_NOTICE" | "EXITED";
  department: Department;
  designation: Designation;
}

export interface LeaveType {
  id: string;
  name: string;
  defaultAnnualDays: number;
  carryForwardAllowed: boolean;
  isPaid: boolean;
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  balance: number;
}

export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  dayCount: number;
  reason: string;
  status: LeaveRequestStatus;
  decisionNote: string | null;
  leaveType?: LeaveType;
  employee?: Pick<Employee, "id" | "employeeCode" | "firstName" | "lastName">;
}

export type ExpenseClaimStatus = "PENDING" | "APPROVED" | "REJECTED" | "REIMBURSED";

export interface ExpenseReceipt {
  id: string;
  fileUrl: string;
}

export interface ExpenseClaim {
  id: string;
  employeeId: string;
  category: string;
  amount: number;
  description: string | null;
  expenseDate: string;
  status: ExpenseClaimStatus;
  decisionNote: string | null;
  receipts: ExpenseReceipt[];
  employee?: Pick<Employee, "id" | "employeeCode" | "firstName" | "lastName">;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: "DRAFT" | "PROCESSED" | "PAID";
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  basic: number;
  hra: number;
  specialAllowance: number;
  overtimePay: number;
  bonusIncentive: number;
  grossEarnings: number;
  providentFund: number;
  esi: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  netPay: number;
  workingDays: number;
  paidDays: number;
  generatedAt: string;
  payrollRun?: PayrollRun;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  effectiveFrom: string;
  basic: number;
  hra: number;
  specialAllowance: number;
}

export type JobPostingStatus = "OPEN" | "CLOSED" | "ON_HOLD";
export type CandidateStage = "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";
export type InterviewMode = "ONSITE" | "VIDEO" | "PHONE";
export type InterviewStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type OfferStatus = "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";

export interface JobPosting {
  id: string;
  title: string;
  departmentId: string;
  designationId: string | null;
  description: string;
  status: JobPostingStatus;
  postedAt: string;
  department?: Department;
  designation?: Designation;
  _count?: { candidates: number };
}

export interface Offer {
  id: string;
  candidateId: string;
  designationId: string;
  proposedSalary: number;
  status: OfferStatus;
  joiningDate: string | null;
}

export interface Interview {
  id: string;
  candidateId: string;
  scheduledAt: string;
  interviewerId: string;
  mode: InterviewMode;
  status: InterviewStatus;
  feedback: string | null;
  rating: number | null;
  interviewer?: Pick<Employee, "id" | "firstName" | "lastName">;
}

export interface Candidate {
  id: string;
  jobPostingId: string;
  fullName: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  appliedAt: string;
  stage: CandidateStage;
  interviews?: Interview[];
  offer?: Offer | null;
}

export interface DashboardStats {
  headcountByStatus: { status: string; count: number }[];
  activeEmployeeCount: number;
  todayAttendancePercent: number;
  pendingLeaveApprovals: number;
  pendingExpenseClaims: number;
  nextHoliday: Holiday | null;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  isNightShift: boolean;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  isOptional: boolean;
}

export interface Break {
  id: string;
  attendanceRecordId: string;
  startAt: string;
  endAt: string | null;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkInAt: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInWithinGeofence: boolean | null;
  checkOutAt: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutWithinGeofence: boolean | null;
  status: "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT" | "ON_LEAVE";
  breaks?: Break[];
  correctionNote: string | null;
}

export interface GeoFenceLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  channel: "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";
  isRead: boolean;
  createdAt: string;
}

export interface CompOffCredit {
  id: string;
  employeeId: string;
  earnedForDate: string;
  expiresAt: string;
  isUsed: boolean;
  usedInRequestId: string | null;
}

export interface LeaveAllocation {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocatedDays: number;
  carriedForwardDays: number;
}

export interface BankDetail {
  id: string;
  employeeId: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  updatedAt: string;
}

export type AdHocPayType = "BONUS" | "INCENTIVE" | "DEDUCTION" | "LOAN_EMI";

export interface AdHocPayComponent {
  id: string;
  employeeId: string;
  payrollRunId: string | null;
  type: AdHocPayType;
  amount: number;
  description: string | null;
  applied: boolean;
  createdAt: string;
}

export type PerformanceCycleStatus = "DRAFT" | "ACTIVE" | "CLOSED";
export type GoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type ReviewType = "SELF" | "MANAGER";

export interface PerformanceCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PerformanceCycleStatus;
}

export interface Goal {
  id: string;
  employeeId: string;
  cycleId: string;
  title: string;
  description: string | null;
  weightPercent: number;
  targetValue: number | null;
  achievedValue: number | null;
  metricUnit: string | null;
  status: GoalStatus;
}

export interface PerformanceReview {
  id: string;
  cycleId: string;
  employeeId: string;
  reviewerId: string;
  type: ReviewType;
  rating: number;
  strengths: string | null;
  improvements: string | null;
  submittedAt: string;
  reviewer?: Pick<Employee, "id" | "firstName" | "lastName">;
}

export interface PromotionRecord {
  id: string;
  employeeId: string;
  cycleId: string | null;
  previousDesignationId: string;
  newDesignationId: string;
  effectiveDate: string;
  note: string | null;
  createdAt: string;
  previousDesignation?: Designation;
  newDesignation?: Designation;
}

export interface AttendanceReport {
  month: number;
  year: number;
  workingDays: number;
  employees: {
    employee: Pick<Employee, "id" | "employeeCode" | "firstName" | "lastName">;
    workingDays: number;
    presentDays: number;
    lateDays: number;
    halfDays: number;
    onLeaveDays: number;
    unrecordedAbsentDays: number;
  }[];
}

export interface LeaveReport {
  year: number;
  employees: {
    employee: Pick<Employee, "id" | "employeeCode" | "firstName" | "lastName">;
    leaveBalances: { leaveType: string; allocated: number; carriedForward: number; used: number; balance: number }[];
  }[];
}

export interface PayrollRegister {
  payrollRun: PayrollRun;
  payslips: (Payslip & { employee: Pick<Employee, "employeeCode" | "firstName" | "lastName"> })[];
  totals: {
    grossEarnings: number;
    providentFund: number;
    esi: number;
    professionalTax: number;
    tds: number;
    otherDeductions: number;
    netPay: number;
  };
  employeeCount: number;
}
