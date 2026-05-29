import { supabase } from "./supabase";
import {
  Broadcast,
  BroadcastType,
  BroadcastPriority,
} from "../types/broadcast";

export const broadcastService = {
  async getBroadcasts(): Promise<Broadcast[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("No user");
    const { data: profile } = await supabase
      .from("profiles")
      .select("department")
      .eq("id", user.user.id)
      .single();

    const department = profile?.department ?? "";
    const filter = `broadcast_type.eq.global,broadcast_type.eq.emergency,broadcast_type.eq.event,and(broadcast_type.eq.department,target_department.eq.${department})`;

    const { data, error } = await supabase
      .from("broadcasts")
      .select(
        "id,title,message,broadcast_type,target_department,priority,created_by,created_at,expires_at,is_pinned",
      )
      .or(filter)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: reads } = await supabase
      .from("broadcast_reads")
      .select("broadcast_id")
      .eq("employee_id", user.user.id);
    const readSet = new Set(reads?.map((r) => r.broadcast_id) || []);
    return (data || []).map((b) => ({ ...b, read_by_user: readSet.has(b.id) }));
  },

  async markAsRead(broadcastId: string) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase
      .from("broadcast_reads")
      .upsert(
        { broadcast_id: broadcastId, employee_id: user.user.id },
        { onConflict: "broadcast_id,employee_id" },
      );
    if (error && error.code !== "23505") throw error;
  },

  async createBroadcast(data: {
    title: string;
    message: string;
    broadcast_type: BroadcastType;
    target_department?: string;
    priority: BroadcastPriority;
    expires_at?: string;
    is_pinned?: boolean;
  }) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Not authenticated");
    const { error } = await supabase.from("broadcasts").insert({
      ...data,
      created_by: user.user.id,
    });
    if (error) throw error;
  },

  async updateBroadcast(id: string, updates: Partial<Broadcast>) {
    const { error } = await supabase
      .from("broadcasts")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
  },

  async deleteBroadcast(id: string) {
    const { error } = await supabase.from("broadcasts").delete().eq("id", id);
    if (error) throw error;
  },

  // Returns an unsubscribe function
  subscribe(onChange: () => void) {
    const channelName = `broadcasts-${Date.now()}`; // unique per subscription
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcasts" },
        () => onChange(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
