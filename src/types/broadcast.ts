export type BroadcastType = "global" | "department" | "emergency" | "event";
export type BroadcastPriority = "normal" | "important" | "critical";

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  broadcast_type: BroadcastType;
  target_department: string | null;
  priority: BroadcastPriority;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  is_pinned: boolean;
  read_by_user?: boolean;
}
