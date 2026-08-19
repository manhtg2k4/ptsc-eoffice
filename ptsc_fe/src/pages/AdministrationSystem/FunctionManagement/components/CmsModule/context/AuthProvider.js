import React, { createContext, useEffect, useState } from "react";
// Import Redux store from FE_TTHC
import tthcStore from "@redux/store";
import { logoutUser } from "@redux/slices/User/UserSlice";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => tthcStore.getState().auth?.currentUser);
  const [userPermissions, setUserPermissions] = useState(() => tthcStore.getState().users?.userPermissions);
  const loading = false;
  const authConfig = { authType: "local" };

  useEffect(() => {
    // Subscribe to FE_TTHC Redux store changes to keep user synchronized
    const unsubscribe = tthcStore.subscribe(() => {
      const state = tthcStore.getState();
      const currentUser = state.auth?.currentUser;
      const currentPermissions = state.users?.userPermissions;
      setUser(currentUser);
      setUserPermissions(currentPermissions);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    // FE_TTHC handles login externally. This is a dummy for CMS compatibility if called.
    logger.warn("CMS login called, but authentication is strictly handled by FE_TTHC.");
  };

  const logout = async () => {
    // Dispatch logout to FE_TTHC
    tthcStore.dispatch(logoutUser());
  };

  const revalidateUser = async () => {};

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        userPermissions,
        loading,
        authConfig,
        login,
        logout,
        revalidateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

