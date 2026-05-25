import React, { createContext, useContext, useEffect, useState } from "react";

import { Session, User } from "@supabase/supabase-js";

import { supabase } from "../services/supabase";

interface AuthContextType {
  user: User | null;

  session: Session | null;

  loading: boolean;

  profile: any;

  fetchProfile: (currentUserId?: string) => Promise<void>;

  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);

  const [session, setSession] = useState<Session | null>(null);

  const [profile, setProfile] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  // FETCH PROFILE with retry logic

  const fetchProfile = async (currentUserId?: string, retryCount = 0) => {
    try {
      const userId = currentUserId || user?.id;

      if (!userId) {
        console.log("No user ID provided to fetchProfile");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.log("PROFILE ERROR:", error);
        return;
      }

      if (!data && retryCount < 3) {
        // Profile not found, retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
        console.log(
          `Profile not found for ${userId}, retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchProfile(currentUserId, retryCount + 1);
      }

      setProfile(data);
      if (data) {
        console.log("Profile loaded successfully:", data.full_name);
      }
    } catch (error) {
      console.log("Fetch Profile Error:", error);
    }
  };

  // SIGN OUT

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.log(error);

        return;
      }

      // CLEAR STATES

      setUser(null);

      setSession(null);

      setProfile(null);
    } catch (error) {
      console.log(error);
    }
  };

  // INITIAL SESSION

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);

      setUser(session?.user || null);

      if (session?.user?.id) {
        await fetchProfile(session.user.id);
      }

      setLoading(false);
    };

    getSession();

    // AUTH LISTENER

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // PREVENT MULTIPLE REFRESH

        if (event === "TOKEN_REFRESHED") {
          return;
        }

        setSession(session);

        setUser(session?.user || null);

        // FETCH PROFILE ONLY ON SIGN IN

        if (event === "SIGNED_IN" && session?.user?.id) {
          await fetchProfile(session.user.id);
        }

        // CLEAR PROFILE ON LOGOUT

        if (event === "SIGNED_OUT") {
          setProfile(null);
        }

        setLoading(false);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,

        session,

        loading,

        profile,

        fetchProfile,

        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
