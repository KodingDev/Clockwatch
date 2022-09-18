/**
 * Clockify API types
 */
import { Currency } from "@/api/currency";

export interface User {
  id: string;
  name: string;
  memberships: Membership[];
}

export interface Membership {
  hourlyRate: CurrencyPair;
  costRate: CurrencyPair;
  membershipType: "WORKSPACE" | "PROJECT";
  targetId: string;
  userId: string;
}

export interface CurrencyPair {
  amount: number;
  currency: Currency;
}

export interface Workspace {
  id: string;
  name: string;
  hourlyRate: CurrencyPair;
  memberships: Membership[];
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  hourlyRate?: CurrencyPair;
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
