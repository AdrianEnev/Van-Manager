"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getMyVehicles, type VehicleAssignment } from '../lib/api';
import { useAuth } from './auth-provider';

export type VehicleAccessContextValue = {
  awaitingApproval: boolean;
  shouldRestrict: boolean;
  checking: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
};

const VehicleAccessContext = createContext<VehicleAccessContextValue | undefined>(undefined);

export function VehicleAccessProvider({ children }: { children: ReactNode }) {
  const { authed, user } = useAuth();
  const [assignments, setAssignments] = useState<VehicleAssignment[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldCheck = authed && user?.role === 'user';

  const resetState = useCallback(() => {
    setAssignments(null);
    setChecking(false);
    setHasChecked(false);
    setError(null);
  }, []);

  const fetchAssignments = useCallback(async () => {
    if (!shouldCheck) {
      resetState();
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const list = await getMyVehicles();
      setAssignments(list);
    } catch (err: any) {
      const message = err?.message || 'Unable to verify your account status right now.';
      setError(message);
      setAssignments(null);
    } finally {
      setChecking(false);
      setHasChecked(true);
    }
  }, [shouldCheck, resetState]);

  useEffect(() => {
    if (shouldCheck) {
      fetchAssignments();
    } else {
      resetState();
    }
  }, [shouldCheck, fetchAssignments, resetState]);

  const checkingState = shouldCheck ? checking || (!hasChecked && !error) : false;
  const lacksAssignments = (assignments?.length ?? 0) === 0;
  const awaitingApproval = shouldCheck && hasChecked && !checking && !error && lacksAssignments;
  const blockedByError = shouldCheck && hasChecked && !!error;
  const pendingVerification = shouldCheck && checkingState && !error && lacksAssignments;
  const shouldRestrict = awaitingApproval || blockedByError || pendingVerification;

  const value = useMemo<VehicleAccessContextValue>(() => ({
    awaitingApproval,
    shouldRestrict,
    checking: checkingState,
    error,
    refreshStatus: fetchAssignments,
  }), [awaitingApproval, shouldRestrict, checkingState, error, fetchAssignments]);

  return <VehicleAccessContext.Provider value={value}>{children}</VehicleAccessContext.Provider>;
}

export function useVehicleAccess() {
  const ctx = useContext(VehicleAccessContext);
  if (!ctx) throw new Error('useVehicleAccess must be used within VehicleAccessProvider');
  return ctx;
}
