import { CurrencyPair, Project, TimeEntry, User, Workspace } from "@/api/generic";
import { TimeRange } from "@/api";

export interface TimeTracker {
  getUser(): Promise<User>;

  getWorkspaces(): Promise<Workspace[]>;

  getProjects(workspaceId: string): Promise<Project[]>;

  getTimeEntries(workspaceId: string, userId: string, start: Date, end: Date): Promise<TimeEntry[]>;

  getTimeEntriesFromRange(workspaceId: string, userId: string, range: TimeRange): Promise<TimeEntry[]>;

  getUsers(workspaceId: string): Promise<User[]>;

  getWorkspaceById(id: string): Promise<Workspace>;

  getProjectById(workspaceId: string, projectId: string): Promise<Project>;

  getUserById(workspaceId: string, userId: string): Promise<User>;

  getHourlyRate(workspace: Workspace, user: User): Promise<CurrencyPair | undefined>;

  validateApiKey(key: string): void;
}
