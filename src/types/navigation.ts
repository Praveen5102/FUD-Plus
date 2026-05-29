// types/navigation.ts

import { Broadcast } from "./broadcast";

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  AdminTabs: undefined;
  EmployeeTabs: undefined;
  EditEmployeeScreen: { employee: any };
  CreateBroadcast: undefined;
  BroadcastDetails: { broadcast: Broadcast; isAdmin?: boolean };
  EditBroadcast: { broadcast: Broadcast };
  Notifications: undefined;
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
