"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "../services/supabase";
import { errorMessage } from "../services/errors";
export function useAdmin() {
  const [state, setState] = useState<{
    loading: boolean;
    admin: boolean;
    email: string;
    error: string;
    factorId?: string;
  }>({ loading: true, admin: false, email: "", error: "" });
  useEffect(() => {
    let active = true;
    let revision = 0;
    let unsubscribe = () => {};
    try {
      const client = getSupabase();
      const check = async () => {
        const current = ++revision;
        try {
          const {
            data: { session },
          } = await client.auth.getSession();
          if (!session) {
            if (active && current === revision)
              setState({ loading: false, admin: false, email: "", error: "" });
            return;
          }
          const { data: userData, error: userError } =
            await client.auth.getUser();
          if (userError || !userData.user)
            throw userError ?? new Error("Invalid session");
          const assurance =
            await client.auth.mfa.getAuthenticatorAssuranceLevel();
          if (assurance.error) throw assurance.error;
          if (
            assurance.data.nextLevel === "aal2" &&
            assurance.data.currentLevel !== "aal2"
          ) {
            const factors = await client.auth.mfa.listFactors();
            if (factors.error) throw factors.error;
            const factor = factors.data.totp.find(
              (item) => item.status === "verified",
            );
            if (factor && active && current === revision) {
              setState({
                loading: false,
                admin: false,
                email: userData.user.email ?? "",
                error: "",
                factorId: factor.id,
              });
              return;
            }
          }
          const { data, error } = await client.rpc("is_admin");
          if (error) throw error;
          if (active && current === revision)
            setState({
              loading: false,
              admin: !!data,
              email: userData.user.email ?? "",
              error: data
                ? ""
                : "Esta cuenta no tiene permisos de administración.",
            });
        } catch (e) {
          if (active && current === revision)
            setState({
              loading: false,
              admin: false,
              email: "",
              error: errorMessage(e),
            });
        }
      };
      void check();
      const { data } = client.auth.onAuthStateChange(() => {
        setTimeout(() => {
          if (active) void check();
        }, 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      const refresh = () => {
        if (document.visibilityState === "visible") void check();
      };
      document.addEventListener("visibilitychange", refresh);
      const interval = setInterval(refresh, 60000);
      unsubscribe = () => {
        data.subscription.unsubscribe();
        document.removeEventListener("visibilitychange", refresh);
        clearInterval(interval);
      };
    } catch (e) {
      queueMicrotask(() => {
        if (active)
          setState({
            loading: false,
            admin: false,
            email: "",
            error: errorMessage(e),
          });
      });
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return state;
}
