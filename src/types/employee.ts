export interface Employee {
  id: string;

  fullName: string;

  department: string;

  joiningDate: string;

  status: "Present" | "Absent" | "Late";
}
