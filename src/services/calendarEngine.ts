import {
  format,
  parseISO,
  eachDayOfInterval,
  isWithinInterval,
} from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export interface CalendarColorConfig {
  color: string;
  bg: string;
  border: string;
  label: string;
  icon: string;
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
  from_date: string;
  to_date: string;
  status: "Pending" | "Approved" | "Rejected";
  leave_type: string;
  profiles?: { department?: string } | null;
}

export interface AttendanceDay {
  id: string;
  employee_id?: string;
  attendance_date: string;
  work_status: string | null;
  check_in?: string | null;
  check_out?: string | null;
  total_work_hours?: number | null;
  profiles?: { department?: string } | null;
}

export interface MarkedDay {
  customStyles: {
    container: object;
    text: object;
  };
  meta: CalendarColorConfig & { label: string };
}

export type MarkedDatesMatrix = Record<string, MarkedDay>;

export interface PayrollSummary {
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

// ============================================================================
// CALENDAR COLOR CONFIGURATIONS
// ============================================================================

export const CALENDAR_COLORS: Record<string, CalendarColorConfig> = {
  present: {
    color: "#4ade80",
    bg: "rgba(74,222,128,0.15)",
    border: "rgba(74,222,128,0.35)",
    label: "Present",
    icon: "checkmark-circle",
  },
  absent: {
    color: "#f87171",
    bg: "rgba(248,113,113,0.15)",
    border: "rgba(248,113,113,0.35)",
    label: "Absent",
    icon: "close-circle",
  },
  late: {
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.15)",
    border: "rgba(251,191,36,0.35)",
    label: "Late Login",
    icon: "time",
  },
  halfDay: {
    color: "#fb923c",
    bg: "rgba(251,146,60,0.15)",
    border: "rgba(251,146,60,0.35)",
    label: "Half Day",
    icon: "contrast",
  },
  holiday: {
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.15)",
    border: "rgba(96,165,250,0.35)",
    label: "Holiday",
    icon: "flag",
  },
  weekoff: {
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.2)",
    label: "Weekoff",
    icon: "cafe",
  },
  leave: {
    color: "#c084fc",
    bg: "rgba(192,132,252,0.15)",
    border: "rgba(192,132,252,0.35)",
    label: "Approved Leave",
    icon: "calendar",
  },
  pending: {
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.1)",
    border: "rgba(56,189,248,0.3)",
    label: "Pending Leave",
    icon: "hourglass",
  },
  future: {
    color: "#334155",
    bg: "transparent",
    border: "transparent",
    label: "Future",
    icon: "ellipsis-horizontal",
  },
};

// ============================================================================
// GOOGLE CALENDAR INTEGRATION
// ============================================================================

const INDIAN_CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com";

/**
 * Retrieves the Google Calendar API key from environment variables.
 * Returns undefined if not set.
 */
function getGoogleApiKey(): string | undefined {
  // Supports both Expo and standard React Native env variable patterns
  const key =
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_API_KEY ||
    process.env.GOOGLE_CALENDAR_API_KEY ||
    process.env.REACT_APP_GOOGLE_CALENDAR_API_KEY;
  return key || undefined;
}

/**
 * Fetches public holidays from Google Calendar for a given year.
 * If no API key is configured, returns an empty array (only Supabase holidays will be used).
 */
export async function fetchGoogleHolidaysForYear(
  year: number,
): Promise<CompanyHoliday[]> {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    console.warn(
      "[calendarEngine] Google Calendar API key not configured. Skipping external holiday fetch.",
    );
    return [];
  }

  try {
    const timeMin = encodeURIComponent(`${year}-01-01T00:00:00Z`);
    const timeMax = encodeURIComponent(`${year}-12-31T23:59:59Z`);
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      INDIAN_CALENDAR_ID,
    )}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Google Calendar API responded with ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    if (!data.items?.length) return [];

    return data.items.map((event: any) => ({
      id: event.id,
      title: event.summary ?? "Holiday",
      holiday_date: (event.start?.date ?? event.start?.dateTime ?? "").split(
        "T",
      )[0],
      holiday_type: "Public" as const,
      description: event.description ?? "",
      is_active: true,
    }));
  } catch (error) {
    console.error(
      "[calendarEngine] Failed to fetch Google Calendar holidays:",
      error,
    );
    return [];
  }
}

// ============================================================================
// MARKED DATES MATRIX BUILDER
// ============================================================================

/**
 * Converts an attendance work status to the corresponding calendar color configuration.
 * Returns null if the status does not map to any known attendance state.
 */
function statusToColorConfig(
  status: string | null | undefined,
): CalendarColorConfig | null {
  switch (status) {
    case "Present":
      return CALENDAR_COLORS.present;
    case "Late":
      return CALENDAR_COLORS.late;
    case "Half Day":
      return CALENDAR_COLORS.halfDay;
    case "Absent":
      return CALENDAR_COLORS.absent;
    default:
      return null;
  }
}

/**
 * Creates a MarkedDay object for a given color configuration.
 */
function createMarkedDay(config: CalendarColorConfig): MarkedDay {
  return {
    customStyles: {
      container: {
        backgroundColor: config.bg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: config.border,
        justifyContent: "center",
        alignItems: "center",
      },
      text: { color: config.color, fontWeight: "700" as const },
    },
    meta: config,
  };
}

/**
 * Builds a complete marked dates matrix for a given month and year.
 *
 * Priority order (highest wins):
 * 1. Attendance record (Present / Late / Half Day / Absent)
 * 2. Approved leave (if not already a holiday)
 * 3. Holiday (Supabase or Google)
 * 4. Weekoff
 * 5. Future date (no marking)
 */
export function buildUnifiedMarkedDatesMatrix(
  year: number,
  month: number,
  attendanceList: AttendanceDay[],
  holidayList: CompanyHoliday[],
  leaveList: LeaveRequest[],
  weekoffDays: string[],
): MarkedDatesMatrix {
  const matrix: MarkedDatesMatrix = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

  // Pre-build lookup maps for performance
  const activeHolidays = holidayList.filter((h) => h.is_active);
  const holidayDateSet = new Set(activeHolidays.map((h) => h.holiday_date));

  const attendanceByDate = new Map(
    attendanceList.map((att) => [att.attendance_date, att]),
  );

  const approvedLeaves = leaveList.filter(
    (leave) => leave.status === "Approved",
  );

  for (const day of daysInMonth) {
    const dateStr = format(day, "yyyy-MM-dd");
    const isPast = day <= today;
    const dayName = format(day, "EEEE");

    // Default: if future date, no marking
    if (!isPast) {
      matrix[dateStr] = createMarkedDay(CALENDAR_COLORS.future);
    }

    // Layer 4: Weekoff (lowest priority)
    if (weekoffDays.includes(dayName)) {
      matrix[dateStr] = createMarkedDay(CALENDAR_COLORS.weekoff);
    }

    // Layer 3: Holiday (overrides weekoff)
    if (holidayDateSet.has(dateStr)) {
      matrix[dateStr] = createMarkedDay(CALENDAR_COLORS.holiday);
    }

    // Layer 2: Approved leave (only if not already a holiday)
    if (!holidayDateSet.has(dateStr)) {
      const isOnLeave = approvedLeaves.some((leave) => {
        try {
          const fromDate = parseISO(leave.from_date);
          const toDate = parseISO(leave.to_date);
          return isWithinInterval(day, { start: fromDate, end: toDate });
        } catch {
          return false;
        }
      });
      if (isOnLeave) {
        matrix[dateStr] = createMarkedDay(CALENDAR_COLORS.leave);
      }
    }

    // Layer 1: Attendance record (highest priority)
    const attendanceRecord = attendanceByDate.get(dateStr);
    if (attendanceRecord) {
      const colorConfig = statusToColorConfig(attendanceRecord.work_status);
      if (colorConfig) {
        matrix[dateStr] = createMarkedDay(colorConfig);
      }
    }
  }

  return matrix;
}

// ============================================================================
// PAYROLL SUMMARY COMPUTATION
// ============================================================================

/**
 * Computes payroll statistics for a given month based on marked dates and raw attendance.
 */
export function computePayrollSummary(
  matrix: MarkedDatesMatrix,
  attendanceList: AttendanceDay[],
  year: number,
  month: number,
): PayrollSummary {
  let present = 0,
    late = 0,
    halfDay = 0,
    absent = 0;
  let weekoffs = 0,
    holidays = 0,
    leavesCount = 0;

  // Aggregate raw attendance records for the specified month
  for (const rec of attendanceList) {
    const date = new Date(rec.attendance_date);
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month) continue;

    switch (rec.work_status) {
      case "Present":
        present++;
        break;
      case "Late":
        late++;
        break;
      case "Half Day":
        halfDay++;
        break;
      case "Absent":
        absent++;
        break;
      default:
        break;
    }
  }

  // Count special days from the marked matrix
  for (const day of Object.values(matrix)) {
    const label = (day as MarkedDay).meta?.label;
    if (label === "Weekoff") weekoffs++;
    else if (label === "Holiday") holidays++;
    else if (label === "Approved Leave") leavesCount++;
  }

  const totalDays = Object.keys(matrix).length;
  const workingDays = Math.max(0, totalDays - weekoffs - holidays);
  const attended = present + late + halfDay * 0.5;
  const attendanceRate =
    workingDays > 0
      ? Math.min(100, Math.round((attended / workingDays) * 100))
      : 0;

  return {
    totalDays,
    weekoffs,
    holidays,
    approvedLeaves: leavesCount,
    workingDays,
    present,
    late,
    halfDay,
    absent,
    attendanceRate,
  };
}
