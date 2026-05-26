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

export interface GooglePublicHoliday {
  id: string;
  title: string;
  holiday_date: string;
  holiday_type: string;
  description: string;
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
