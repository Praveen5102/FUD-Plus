import { format, parseISO, eachDayOfInterval } from "date-fns";

export const CALENDAR_COLORS = {
  present: {
    color: "#4ade80",
    bg: "rgba(74,222,128,0.12)",
    border: "rgba(74,222,128,0.3)",
    label: "Present",
    icon: "checkmark",
  },
  absent: {
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.3)",
    label: "Absent",
    icon: "close",
  },
  late: {
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.3)",
    label: "Late Login",
    icon: "time",
  },
  halfDay: {
    color: "#fb923c",
    bg: "rgba(251,146,60,0.12)",
    border: "rgba(251,146,60,0.3)",
    label: "Half Day",
    icon: "contrast",
  },
  holiday: {
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
    border: "rgba(96,165,250,0.3)",
    label: "Holiday",
    icon: "flag",
  },
  weekoff: {
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.2)",
    label: "Weekoff",
    icon: "gift",
  },
  leave: {
    color: "#c084fc",
    bg: "rgba(192,132,252,0.12)",
    border: "rgba(192,132,252,0.3)",
    label: "Approved Leave",
    icon: "calendar",
  },
};

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "YOUR_GOOGLE_API_KEY_HERE";
const INDIAN_HOLIDAY_CALENDAR_ID =
  "en.indian#holiday@group.v.calendar.google.com";

export async function fetchGoogleHolidaysForYear(year: number): Promise<any[]> {
  if (
    GOOGLE_API_KEY === process.env.GOOGLE_API_KEY ||
    GOOGLE_API_KEY === "YOUR_GOOGLE_API_KEY_HERE"
  ) {
    // Fallback dictionary array mock if API key hasn't been pasted yet to avoid hard crashes
    return [
      {
        id: "f1",
        title: "Republic Day",
        holiday_date: `${year}-01-26`,
        holiday_type: "Public",
      },
      {
        id: "f2",
        title: "Independence Day",
        holiday_date: `${year}-08-15`,
        holiday_type: "Public",
      },
      {
        id: "f3",
        title: "Gandhi Jayanti",
        holiday_date: `${year}-10-02`,
        holiday_type: "Public",
      },
      {
        id: "f4",
        title: "Christmas",
        holiday_date: `${year}-12-25`,
        holiday_type: "Company",
      },
    ];
  }

  try {
    const timeMin = `${year}-01-01T00:00:00Z`;
    const timeMax = `${year}-12-31T23:59:59Z`;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(INDIAN_HOLIDAY_CALENDAR_ID)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();
    if (!data.items) return [];

    return data.items.map((event: any) => ({
      id: event.id,
      title: event.summary,
      holiday_date: event.start.date || event.start.dateTime.split("T")[0],
      holiday_type: "Public",
      description: event.description || "Public Holiday",
    }));
  } catch (error) {
    console.error("Google Calendar endpoint communication dropped:", error);
    return [];
  }
}

export function buildUnifiedMarkedDatesMatrix(
  year: number,
  month: number,
  attendanceList: any[],
  googleHolidaysList: any[],
  leaveList: any[],
  weekoffDays: string[],
) {
  const matrix: Record<string, any> = {};
  const startBound = new Date(year, month - 1, 1);
  const endBound = new Date(year, month, 0);

  const daysInInterval = eachDayOfInterval({
    start: startBound,
    end: endBound,
  });

  daysInInterval.forEach((currentDay) => {
    const dateStr = format(currentDay, "yyyy-MM-dd");
    const dayName = format(currentDay, "EEEE");

    // 1. Layer: Weekoffs
    if (weekoffDays.includes(dayName)) {
      matrix[dateStr] = createMarkedDayObject(CALENDAR_COLORS.weekoff);
    }

    // 2. Layer: Google Holidays
    const isGoogleHoliday = googleHolidaysList.some(
      (h) => h.holiday_date === dateStr,
    );
    if (isGoogleHoliday) {
      matrix[dateStr] = createMarkedDayObject(CALENDAR_COLORS.holiday);
    }

    // 3. Layer: Leaves
    const matchedLeave = leaveList.find((l) => {
      if (l.status !== "Approved") return false;
      const f = parseISO(l.from_date);
      const t = parseISO(l.to_date);
      return currentDay >= f && currentDay <= t;
    });
    if (matchedLeave) {
      matrix[dateStr] = createMarkedDayObject(CALENDAR_COLORS.leave);
    }

    // 4. Layer: Attendance Overwrite
    const matchAttendance = attendanceList.find(
      (a) => a.attendance_date === dateStr,
    );
    if (matchAttendance) {
      const status = matchAttendance.work_status;
      if (status === "Present")
        matrix[dateStr] = createMarkedDayObject(CALENDAR_COLORS.present);
      else if (status === "Late")
        matrix[dateStr] = createMarkedDayObject(CALENDAR_COLORS.late);
      else if (status === "Half Day")
        matrix[dateStr] = createMarkedDayObject(CALENDAR_COLORS.halfDay);
      else if (status === "Absent")
        matrix[dateStr] = createMarkedDayObject(CALENDAR_COLORS.absent);
    }
  });

  return matrix;
}

function createMarkedDayObject(cfg: any) {
  return {
    customStyles: {
      container: {
        backgroundColor: cfg.bg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: cfg.border,
        justifyContent: "center",
        alignItems: "center",
      },
      text: { color: cfg.color, fontWeight: "700" },
    },
    meta: cfg,
  };
}
