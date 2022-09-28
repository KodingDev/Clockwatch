import { Currency } from "@/api/client";

export interface Workspace {
  id: string;
  name: string;

  hourlyRate?: CurrencyPair;
  users?: User[];
}

export interface Project {
  id: string;
  name: string;

  client?: Client;
  workspace?: Workspace;
  hourlyRate?: CurrencyPair;
}

export interface Client {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;

  workspaces?: Workspace[];
  hourlyRate?: CurrencyPair;
}

export interface TimeEntry {
  workspace?: Workspace;
  project?: Project;
  user?: User;

  description?: string;
  durationMS: number;
  total?: number;
}

export interface CurrencyPair {
  amount: number;
  currency: Currency;
}
