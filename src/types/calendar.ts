// types/calendar.ts

export interface DynamicCalendarStatus {
  color: string;
  bg: string;
  border: string;
  label: string;
  icon: string;
}

export interface DepartmentWeekoffRule {
  id: string;
  department: string;
  weekoff_days: string[];
  created_at: string;
}

export interface CompanyHoliday {
  id: string;
  title: string;
  holiday_date: string;
  holiday_type: "Public" | "Company" | "Optional";
  description?: string;
  is_active: boolean;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type:
    | "Casual"
    | "Sick"
    | "Earned"
    | "Comp Off"
    | "Maternity"
    | "Paternity";
  from_date: string;
  to_date: string;
  total_days?: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  admin_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  profiles?: {
    full_name?: string;
    department?: string;
    employee_id?: string;
    profile_image?: string | null;
  } | null;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  year: number;
  casual_total: number;
  casual_used: number;
  sick_total: number;
  sick_used: number;
  earned_total: number;
  earned_used: number;
}

export interface CalculatedPayrollSummary {
  totalDays: number;
  weekoffs: number;
  holidays: number;
  approvedLeaves: number;
  workingDays: number;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  attendanceRate: number;
}
