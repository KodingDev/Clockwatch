/**
 * Clockify API types
 */

import { CurrencyPair } from "@/api/generic";

export interface ClockifyUser {
  id: string;
  name: string;
  memberships: ClockifyMembership[];
}

export interface ClockifyMembership {
  hourlyRate: CurrencyPair;
  costRate: CurrencyPair;
  membershipType: "WORKSPACE" | "PROJECT";
  targetId: string;
  userId: string;
}

export interface ClockifyWorkspace {
  id: string;
  name: string;
  hourlyRate: CurrencyPair;
  memberships: ClockifyMembership[];
}

export interface ClockifyProject {
  id: string;
  workspaceId: string;
  name: string;
  hourlyRate?: CurrencyPair;
  billable: boolean;
  clientId?: string;
  clientName: string;
}

export interface ClockifyTimeEntry {
  billable: boolean;
  description: string;
  id: string;
  projectId: string;
  userId: string;
  workspaceId: string;
  timeInterval: ClockifyTimeInterval;
}

export interface ClockifyTimeInterval {
  start: string;
  end?: string;
}
