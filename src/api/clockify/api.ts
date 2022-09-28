import { TimeRange, UserInteractions } from "@/api";
import { ClockifyProject, ClockifyTimeEntry, ClockifyTimeInterval, ClockifyUser, ClockifyWorkspace } from "./types";
import { BotError, BotErrorCode } from "@/discord";
import { APIClient } from "@/api/client";
import { CurrencyPair, Project, TimeEntry, TimeTracker, User, Workspace } from "@/api/generic";

const UUID_REGEX = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", "i");

export class ClockifyAPI extends APIClient implements TimeTracker {
  constructor(private readonly interactions: UserInteractions) {
    super("https://api.clockify.me/api/v1");
  }

  /**
   * Checks an API key and validates it by checking if it is base64
   * encoded and if it is a valid UUID.
   *
   * @param apiKey The API key to check
   */
  validateApiKey(apiKey: string) {
    // Decode the key as base64
    let uuid;

    try {
      uuid = atob(apiKey);
    } catch (e) {
      throw new BotError(BotErrorCode.InvalidApiKey);
    }

    // Check if the decoded key is a valid UUID
    if (!UUID_REGEX.test(uuid)) {
      throw new BotError(BotErrorCode.InvalidApiKey);
    }
  }

  /**
   * Returns the current logged-in user.
   */
  _getUser(): Promise<ClockifyUser> {
    return this.get("/user");
  }

  /**
   * Returns all workspaces the user has access to.
   */
  async _getWorkspaces(): Promise<ClockifyWorkspace[]> {
    const workspaces: ClockifyWorkspace[] = await this.get("/workspaces");
    if (!workspaces.length) throw new BotError(BotErrorCode.NoWorkspacesFound);
    return workspaces;
  }

  /**
   * Returns all projects in a workspace.
   * @param workspaceId The workspace to get the projects for
   */
  _getProjects(workspaceId: string): Promise<ClockifyProject[]> {
    return this.get(`/workspaces/${workspaceId}/projects?page-size=5000`);
  }

  /**
   * Returns time entries for a user in a workspace, between two dates.
   * This endpoint is paged, however given the large page size of 5000
   * we can assume that there will be no more than 1 page.
   *
   * @param workspaceId The workspace to get the time entries for
   * @param userId The user to get the time entries for
   * @param start The start date
   * @param end The end date
   */
  _getTimeEntries(workspaceId: string, userId: string, start: Date, end: Date): Promise<ClockifyTimeEntry[]> {
    return this.get(
      `/workspaces/${workspaceId}/user/${userId}/time-entries?page-size=5000&start=${start.toISOString()}&end=${end.toISOString()}&project-required=false&task-required=false`,
    );
  }

  /**
   * Returns all users in a workspace.
   * @param workspaceId The workspace to get the users for
   */
  _getUsers(workspaceId: string): Promise<ClockifyUser[]> {
    return this.get(`/workspaces/${workspaceId}/users?memberships=WORKSPACE&page-size=5000`);
  }

  /**
   * Returns a workspace by the given ID.
   * @param id The ID of the workspace
   */
  async _getWorkspaceById(id: string): Promise<ClockifyWorkspace> {
    const workspaces = await this._getWorkspaces();
    const workspace = workspaces.find((w) => w.id === id);
    if (!workspace) throw new BotError(BotErrorCode.WorkspaceNotFound);
    return workspace;
  }

  /**
   * Gets a project by the given ID.
   * @param workspaceId The workspace to get the project from
   * @param projectId The ID of the project
   */
  _getProjectById(workspaceId: string, projectId: string): Promise<ClockifyProject> {
    return this.get(`/workspaces/${workspaceId}/projects/${projectId}`);
  }

  /**
   * Get a user by the given ID.
   * @param workspaceId The workspace to get the user from
   * @param userId The ID of the user
   */
  async _getUserById(workspaceId: string, userId: string): Promise<ClockifyUser> {
    const users = await this._getUsers(workspaceId);
    const user = users.find((u) => u.id === userId);
    if (!user) throw new BotError(BotErrorCode.UserNotFound);
    return user;
  }

  async getUser(): Promise<User> {
    const user = await this._getUser();
    return {
      id: user.id,
      name: user.name,
      workspaces: user.memberships
        .filter((m) => m.membershipType === "WORKSPACE")
        .map(
          (m) =>
            <Workspace>{
              id: m.targetId,
            },
        ),
    };
  }

  async getWorkspaces(): Promise<Workspace[]> {
    const workspaces = await this._getWorkspaces();

    return Promise.all(
      workspaces.map(async (w) => {
        const users = await this.getUsers(w.id);

        return <Workspace>{
          id: w.id,
          name: w.name,
          hourlyRate: normalizeRate(w.hourlyRate),
          users,
        };
      }),
    );
  }

  async getProjects(workspaceId: string): Promise<Project[]> {
    const projects = await this._getProjects(workspaceId);
    return projects.map(
      (p) =>
        <Project>{
          id: p.id,
          name: p.name,
          hourlyRate: normalizeRate(p.hourlyRate),
          client: p.clientId ? { id: p.clientId, name: p.clientName } : undefined,
          workspace: {
            id: workspaceId,
          },
        },
    );
  }

  async getTimeEntries(workspaceId: string, userId: string, start: Date, end: Date): Promise<TimeEntry[]> {
    const timeEntries = await this._getTimeEntries(workspaceId, userId, start, end);
    return timeEntries.map(
      (t) =>
        <TimeEntry>{
          workspace: {
            id: workspaceId,
          },
          user: {
            id: userId,
          },
          project: {
            id: t.projectId,
          },
          description: t.description,
          durationMS: getDuration(t.timeInterval),
        },
    );
  }

  async getTimeEntriesFromRange(workspaceId: string, userId: string, range: TimeRange): Promise<TimeEntry[]> {
    const { start, end } = range;
    return this.getTimeEntries(workspaceId, userId, start, end);
  }

  async getUsers(workspaceId: string): Promise<User[]> {
    const workspace = await this._getWorkspaceById(workspaceId);
    const users = await this._getUsers(workspaceId);

    return users.map((u) => {
      const rate = workspace.memberships.find((m) => m.userId === u.id && m.membershipType === "WORKSPACE")?.hourlyRate;

      return <User>{
        id: u.id,
        name: u.name,
        hourlyRate: normalizeRate(rate),
        workspaces: u.memberships
          .filter((m) => m.membershipType === "WORKSPACE")
          .map(
            (m) =>
              <Workspace>{
                id: m.targetId,
              },
          ),
      };
    });
  }

  async getWorkspaceById(id: string): Promise<Workspace> {
    const workspace = await this._getWorkspaceById(id);
    const users = await this.getUsers(id);

    return {
      id: workspace.id,
      name: workspace.name,
      hourlyRate: normalizeRate(workspace.hourlyRate),
      users,
    };
  }

  async getProjectById(workspaceId: string, projectId: string): Promise<Project> {
    const projectData = await this._getProjectById(workspaceId, projectId);
    return {
      id: projectData.id,
      name: projectData.name,
      hourlyRate: normalizeRate(projectData.hourlyRate),
    };
  }

  async getUserById(workspaceId: string, userId: string): Promise<User> {
    const workspaceData = await this._getWorkspaceById(workspaceId);
    const userData = await this._getUserById(workspaceId, userId);

    const rate = workspaceData.memberships.find(
      (m) => m.userId === userId && m.membershipType === "WORKSPACE",
    )?.hourlyRate;

    return {
      id: userData.id,
      name: userData.name,
      hourlyRate: normalizeRate(rate),
    };
  }

  /**
   * Returns the hourly rate for a user in a workspace.
   * @param workspace The workspace to get the rate for
   * @param user The user to get the rate for
   */
  async getHourlyRate(workspace: Workspace, user: User): Promise<CurrencyPair | undefined> {
    const rate = workspace.users?.find((value) => value.id === user.id)?.hourlyRate;

    // Doesn't need to be normalized, since it's already normalized
    return rate ?? workspace.hourlyRate;
  }

  async getCacheId(): Promise<string> {
    return this.interactions.user.id;
  }

  async getHeaders(): Promise<Record<string, string>> {
    const apiKey = await this.interactions.getApiKey();
    if (!apiKey) throw new BotError(BotErrorCode.ApiKeyNotSet);

    return {
      "X-Api-Key": apiKey,
    };
  }
}

/**
 * Gets the duration of a time interval in milliseconds.
 * @param timeInterval The time interval.
 */
const getDuration = (timeInterval: ClockifyTimeInterval): number => {
  const start = new Date(timeInterval.start);
  const end = timeInterval.end ? new Date(timeInterval.end) : new Date();
  return end.getTime() - start.getTime();
};

const normalizeRate = (rate?: CurrencyPair): CurrencyPair | undefined => {
  if (!rate || rate.amount === 0) return undefined;

  return {
    amount: Math.round(rate.amount / 100),
    currency: rate.currency,
  };
};
