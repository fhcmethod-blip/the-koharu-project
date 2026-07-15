"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isOwnerEmail, withOwnerAccess } from "./access";
import type { MembershipTier, User } from "./types";

const AGE_KEY = "kohar_age_ok";
const USER_KEY = "kohar_user";

type AuthContextValue = {
  ready: boolean;
  ageVerified: boolean;
  user: User | null;
  isOwner: boolean;
  verifyAge: () => void;
  signup: (email: string, displayName: string) => void;
  login: (email: string) => void;
  logout: () => void;
  setTier: (tier: MembershipTier) => void;
  grantFullAccess: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return withOwnerAccess(JSON.parse(raw) as User);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setAgeVerified(localStorage.getItem(AGE_KEY) === "1");
    const u = loadUser();
    setUser(u);
    // Persist upgraded owner tier if needed
    if (u && isOwnerEmail(u.email) && u.tier === "vip") {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      localStorage.setItem(AGE_KEY, "1");
      setAgeVerified(true);
    }
    setReady(true);
  }, []);

  const persistUser = useCallback((next: User | null) => {
    const final = next ? withOwnerAccess(next) : null;
    setUser(final);
    if (final) {
      localStorage.setItem(USER_KEY, JSON.stringify(final));
      // Cookies so media API can gate <img>/<video> without custom headers
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `kohar_tier=${final.tier}; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `kohar_email=${encodeURIComponent(final.email)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } else {
      localStorage.removeItem(USER_KEY);
      document.cookie = "kohar_tier=; path=/; max-age=0";
      document.cookie = "kohar_email=; path=/; max-age=0";
    }
  }, []);

  const verifyAge = useCallback(() => {
    localStorage.setItem(AGE_KEY, "1");
    setAgeVerified(true);
  }, []);

  const signup = useCallback(
    (email: string, displayName: string) => {
      const normalized = email.trim().toLowerCase();
      const next: User = {
        id: crypto.randomUUID(),
        email: normalized,
        displayName: displayName.trim() || "Member",
        tier: isOwnerEmail(normalized) ? "vip" : "free",
        ageVerified: true,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(AGE_KEY, "1");
      setAgeVerified(true);
      persistUser(next);
    },
    [persistUser],
  );

  const login = useCallback(
    (email: string) => {
      const normalized = email.trim().toLowerCase();
      const existing = loadUser();
      if (existing && existing.email === normalized) {
        localStorage.setItem(AGE_KEY, "1");
        setAgeVerified(true);
        persistUser(withOwnerAccess(existing));
        return;
      }
      const next: User = {
        id: existing?.id ?? crypto.randomUUID(),
        email: normalized,
        displayName:
          existing?.displayName && existing.email === normalized
            ? existing.displayName
            : normalized.split("@")[0] || "Member",
        tier: isOwnerEmail(normalized)
          ? "vip"
          : existing?.email === normalized
            ? existing.tier
            : "free",
        ageVerified: true,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      localStorage.setItem(AGE_KEY, "1");
      setAgeVerified(true);
      persistUser(next);
    },
    [persistUser],
  );

  const logout = useCallback(() => {
    persistUser(null);
  }, [persistUser]);

  const setTier = useCallback(
    (tier: MembershipTier) => {
      if (!user) return;
      // Owners cannot be downgraded below VIP
      if (isOwnerEmail(user.email) && tier !== "vip") {
        persistUser({ ...user, tier: "vip" });
        return;
      }
      persistUser({ ...user, tier });
    },
    [persistUser, user],
  );

  /** One-click full access for the logged-in session (owner/testing). */
  const grantFullAccess = useCallback(() => {
    if (!user) return;
    localStorage.setItem(AGE_KEY, "1");
    setAgeVerified(true);
    persistUser({ ...user, tier: "vip", ageVerified: true });
  }, [persistUser, user]);

  const isOwner = !!(user && isOwnerEmail(user.email));

  const value = useMemo(
    () => ({
      ready,
      ageVerified,
      user,
      isOwner,
      verifyAge,
      signup,
      login,
      logout,
      setTier,
      grantFullAccess,
    }),
    [
      ready,
      ageVerified,
      user,
      isOwner,
      verifyAge,
      signup,
      login,
      logout,
      setTier,
      grantFullAccess,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
