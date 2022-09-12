/**
 * Clockify API types
 */
export interface User {
  id: string;
  name: string;
  memberships: Membership[];
}

export interface Membership {
  hourlyRate: PayRate;
  costRate: PayRate;
  membershipType: "WORKSPACE" | "PROJECT";
  targetId: string;
  userId: string;
}

export interface PayRate {
  amount: number;
  currency: string;
}

export interface Workspace {
  id: string;
  name: string;
  hourlyRate: PayRate;
  memberships: Membership[];
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  hourlyRate: PayRate;
  billable: boolean;
  clientId?: string;
  clientName: string;
}

export interface TimeEntry {
  billable: boolean;
  description: string;
  id: string;
  projectId: string;
  userId: string;
  workspaceId: string;
  timeInterval: TimeInterval;
}

export interface TimeInterval {
  start: string;
  end?: string;
}

/**
 * Start custom types
 */
export interface ReportData {
  workspaceName: string;
  projectName: string;
  clientName: string;
  userName?: string;
  description?: string;
  price: number;
  durationMS: number;
}
