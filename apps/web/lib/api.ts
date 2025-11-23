export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export const tokens = {
  get access() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  set access(v: string | null) {
    if (typeof window === 'undefined') return;
    if (v) localStorage.setItem(ACCESS_KEY, v);
    else localStorage.removeItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set refresh(v: string | null) {
    if (typeof window === 'undefined') return;
    if (v) localStorage.setItem(REFRESH_KEY, v);
    else localStorage.removeItem(REFRESH_KEY);
  },
  clear() {
    this.access = null;
    this.refresh = null;
  },
};

export function isAuthed() {
  return typeof window !== 'undefined' && !!tokens.access;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = tokens.access;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { error: text || res.statusText }; }
    throw new Error(body.error?.message || body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Cookie-based fetch (for Google auth flow and subsequent session calls)
export async function apiFetchCookie<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include', cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { error: text || res.statusText }; }
    throw new Error(body.error?.message || body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

export async function login(email: string, password: string) {
  const data = await apiFetch<{ user: AuthUser; tokens: { accessToken: string; refreshToken: string } }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) }
  );
  tokens.access = data.tokens.accessToken;
  tokens.refresh = data.tokens.refreshToken;
  return data.user;
}

export async function register(payload: { name: string; email: string; password: string; role?: 'admin' | 'user' }) {
  const data = await apiFetch<{ user: AuthUser; tokens: { accessToken: string; refreshToken: string } }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify(payload) }
  );
  tokens.access = data.tokens.accessToken;
  tokens.refresh = data.tokens.refreshToken;
  return data.user;
}

export function logout() {
  tokens.clear();
}

export async function me(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me');
}

// Cookie session endpoints
export async function loginWithGoogle(idToken: string): Promise<{ message: string; isNewUser: boolean }>{
  return apiFetchCookie('/api/users/login/google', { method: 'POST', body: JSON.stringify({ idToken }) });
}

export async function meCookie(): Promise<AuthUser> {
  return apiFetchCookie<AuthUser>('/api/users/me');
}

export async function logoutCookie(): Promise<{ ok: true }> {
  return apiFetchCookie<{ ok: true }>(
    '/api/users/logout',
    { method: 'POST', body: JSON.stringify({}) }
  );
}

export async function logoutAllCookie(): Promise<{ ok: true }> {
  return apiFetchCookie<{ ok: true }>(
    '/api/users/logout/all',
    { method: 'POST', body: JSON.stringify({}) }
  );
}

export async function updateMe(payload: { name?: string }): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteAccount(): Promise<{ ok: true }> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  const token = tokens.access;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_URL}/auth/me`, { method: 'DELETE', headers, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { error: text || res.statusText }; }
    throw new Error(body.error?.message || body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Password reset helpers
export async function forgotPasswordCookie(email: string): Promise<{ ok: true }> {
  return apiFetchCookie<{ ok: true }>(`/auth/forgot-password`, { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPassword(token: string, password: string): Promise<{ ok: true }> {
  // This endpoint does not require auth; cookie not required
  return apiFetchCookie<{ ok: true }>(`/auth/reset-password`, { method: 'POST', body: JSON.stringify({ token, password }) });
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const res = await apiFetch<{ exists: boolean }>(`/auth/check-email`, { method: 'POST', body: JSON.stringify({ email }) });
  return !!res.exists;
}

// Auto auth fetch: uses header if token exists, otherwise falls back to cookie-based fetch
export async function apiFetchAuto<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (tokens.access) {
    return apiFetch<T>(path, init);
  }
  return apiFetchCookie<T>(path, init);
}

// Domain types
export type Vehicle = {
  id: string;
  plateNumber: string;
  makeModel?: string;
  motExpiry?: string;
  status: 'active' | 'inactive';
  notes?: string;
};

export type VehicleAssignment = {
  assignmentId: string;
  assignedAt: string;
  vehicle: Vehicle;
};

export type Charge = {
  id: string;
  userId: string;
  vehicleId?: string;
  amount: number;
  currency: string;
  type: 'weekly_fee' | 'mot' | 'other';
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
};

export type Payment = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'manual' | 'stripe';
  relatedChargeId?: string;
  createdAt: string;
};

export type Penalty = {
  id: string;
  userId: string;
  vehicleId?: string;
  amount: number;
  reason: string;
  dueDate?: string;
  status: 'pending' | 'paid' | 'waived';
  createdAt: string;
};

// Client functions for user endpoints
export async function getMyVehicles(): Promise<VehicleAssignment[]> {
  return apiFetchAuto<VehicleAssignment[]>(`/api/my/vehicles`);
}

export async function getMyCharges(windowDays = 14): Promise<Charge[]> {
  const p = new URLSearchParams({ windowDays: String(windowDays) });
  return apiFetchAuto<Charge[]>(`/api/my/charges?${p.toString()}`);
}

export async function getMyPayments(windowDays = 14): Promise<Payment[]> {
  const p = new URLSearchParams({ windowDays: String(windowDays) });
  return apiFetchAuto<Payment[]>(`/api/my/payments?${p.toString()}`);
}

export async function getMyPenalties(): Promise<Penalty[]> {
  return apiFetchAuto<Penalty[]>(`/api/my/penalties`);
}

// Admin helpers (require admin role)
export type AdminUser = { id: string; email: string; name: string; role: 'admin' | 'user' };
export async function adminListUsers(): Promise<AdminUser[]> {
  return apiFetchAuto<AdminUser[]>(`/api/users`);
}
export async function adminToggleTransactionAllowed(userId: string, isTransactionAllowed: boolean): Promise<{ id: string; isTransactionAllowed: boolean }> {
  return apiFetchAuto(`/api/users/${userId}/transaction-allowed`, { method: 'PATCH', body: JSON.stringify({ isTransactionAllowed }) });
}

export async function adminListVehicles(): Promise<Vehicle[]> {
  return apiFetchAuto<Vehicle[]>(`/api/vehicles`);
}
export async function adminCreateVehicle(payload: { plateNumber: string; makeModel?: string; motExpiry?: string; status?: 'active' | 'inactive'; notes?: string }): Promise<Vehicle> {
  return apiFetchAuto<Vehicle>(`/api/vehicles`, { method: 'POST', body: JSON.stringify(payload) });
}
export async function adminUpdateVehicle(id: string, payload: Partial<{ makeModel: string; motExpiry: string; status: 'active' | 'inactive'; notes: string }>): Promise<Vehicle> {
  return apiFetchAuto<Vehicle>(`/api/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function adminAssignVehicle(userId: string, vehicleId: string): Promise<{ id: string }> {
  const res = await apiFetchAuto<{ id: string }>(`/api/assignments`, { method: 'POST', body: JSON.stringify({ userId, vehicleId }) });
  return res;
}
export async function adminDetachAssignment(assignmentId: string): Promise<{ ok: true }> {
  return apiFetchAuto<{ ok: true }>(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
}
export async function adminListUserVehicles(userId: string): Promise<VehicleAssignment[]> {
  return apiFetchAuto<VehicleAssignment[]>(`/api/users/${userId}/vehicles`);
}

export async function adminCreateCharge(payload: { userId: string; vehicleId?: string; amount: number; currency?: string; type: 'weekly_fee'|'mot'|'other'; dueDate: string; metadata?: Record<string, any> }): Promise<Charge> {
  return apiFetchAuto<Charge>(`/api/charges`, { method: 'POST', body: JSON.stringify(payload) });
}
export async function adminListCharges(filters: Partial<{ userId: string; vehicleId: string; status: Charge['status']; type: Charge['type']; from: string; to: string }>): Promise<Charge[]> {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
  return apiFetchAuto<Charge[]>(`/api/charges?${p.toString()}`);
}
export async function adminMarkChargePaid(id: string, payload?: { amount?: number; currency?: string; note?: string }): Promise<{ ok: true; paymentId: string }> {
  return apiFetchAuto<{ ok: true; paymentId: string }>(`/api/charges/${id}/mark-paid`, { method: 'POST', body: JSON.stringify(payload || {}) });
}

export async function adminListPayments(filters: Partial<{ userId: string; method: 'manual'|'stripe'; from: string; to: string }>): Promise<Payment[]> {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
  return apiFetchAuto<Payment[]>(`/api/payments?${p.toString()}`);
}
export async function adminRecordManualPayment(payload: { userId: string; amount: number; currency?: string; relatedChargeId?: string; note?: string }): Promise<Payment> {
  return apiFetchAuto<Payment>(`/api/payments/manual`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function adminCreatePenalty(payload: { userId: string; vehicleId?: string; amount: number; reason: string; dueDate?: string; metadata?: Record<string, any> }): Promise<Penalty> {
  return apiFetchAuto<Penalty>(`/api/penalties`, { method: 'POST', body: JSON.stringify(payload) });
}
export async function adminListPenalties(filters: Partial<{ userId: string; vehicleId: string; status: Penalty['status']; from: string; to: string }>): Promise<Penalty[]> {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
  return apiFetchAuto<Penalty[]>(`/api/penalties?${p.toString()}`);
}
export async function adminUpdatePenaltyStatus(id: string, status: Penalty['status']): Promise<Penalty> {
  return apiFetchAuto<Penalty>(`/api/penalties/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
}

// Plans (recurring charges)
export type Plan = {
  id: string;
  userId: string;
  vehicleId?: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'custom_days';
  intervalDays?: number;
  startingDate: string;
  nextDueDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function adminCreatePlan(payload: {
  userId: string;
  vehicleId?: string;
  amount: number;
  currency?: string;
  frequency: 'weekly' | 'monthly' | 'custom_days';
  intervalDays?: number;
  startingDate: string;
}): Promise<Plan> {
  return apiFetchAuto<Plan>(`/api/plans`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function adminListPlans(filters?: Partial<{ userId: string; vehicleId: string; active: boolean }>): Promise<Plan[]> {
  const p = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null) p.set(k, String(v)); });
  const qs = p.toString();
  return apiFetchAuto<Plan[]>(`/api/plans${qs ? `?${qs}` : ''}`);
}

export async function adminUpdatePlan(id: string, payload: Partial<{ amount: number; currency: string; active: boolean }>): Promise<Plan> {
  return apiFetchAuto<Plan>(`/api/plans/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
