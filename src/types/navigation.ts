// types/navigation.ts

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  AdminTabs: undefined;
  EmployeeTabs: undefined;

  // Admin stack screens
  EmployeeDetails: {
    employee: {
      id: string;
      employee_id: string;
      full_name: string;
      email: string;
      role: string;
      department: string;
      joining_date: string;
      employee_image: string | null;
      profile_image: string | null;
      is_active: boolean;
      created_at: string;
      phone_number?: string;
      [key: string]: any; // allow extra fields from supabase
    };
  };
};
