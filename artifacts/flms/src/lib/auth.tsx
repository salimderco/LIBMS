import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, getGetMeQueryKey, type User, type LoginBody } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("flms_token"));
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    }
  });

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("flms_token");
      setToken(null);
      setLocation("/login");
    }
  }, [isError, setLocation]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("flms_token", newToken);
    setToken(newToken);
    queryClient.setQueryData(getGetMeQueryKey(), newUser);
    setLocation("/");
  };

  const logout = () => {
    localStorage.removeItem("flms_token");
    setToken(null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
    setLocation("/login");
  };

  const isLoading = (!!token && isUserLoading);

  return (
    <AuthContext.Provider value={{ user: user || null, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
