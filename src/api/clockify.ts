import { UserInteractions } from "./kv";
import { PayRate, Project, TimeEntry, User, Workspace } from "./types/clockify";
import { BotError, BotErrorCode } from "../discord/error";

const uuidRegex = new RegExp(
  "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
  "i",
);

export class ClockifyAPI {
  private static readonly BASE_URL = "https://api.clockify.me/api/v1";

  constructor(private readonly interactions: UserInteractions) {}

  validateApiKey(apiKey: string) {
    // Decode the key as base64
    let uuid;

    try {
      uuid = atob(apiKey);
    } catch (e) {
      return false;
    }

    // Check if the decoded key is a valid UUID
    if (!uuidRegex.test(uuid)) {
      throw new BotError(BotErrorCode.InvalidApiKey);
    }
  }

  getHourlyRate(workspace: Workspace, user: User): PayRate {
    return (
      workspace.memberships.find((value) => value.userId === user.id)
        ?.hourlyRate ?? workspace.hourlyRate
    );
  }

  getUser(): Promise<User> {
    return this.get("/user");
  }

  getWorkspaces(): Promise<Workspace[]> {
    return this.get("/workspaces");
  }

  getProjects(workspaceId: string): Promise<Project[]> {
    return this.get(`/workspaces/${workspaceId}/projects?page-size=5000`);
  }

  getTimeEntries(
    workspaceId: string,
    userId: string,
    start: Date,
    end: Date,
  ): Promise<TimeEntry[]> {
    return this.get(
      `/workspaces/${workspaceId}/user/${userId}/time-entries?page-size=5000&start=${start.toISOString()}&end=${end.toISOString()}`,
    );
  }

  getUsers(workspaceId: string): Promise<User[]> {
    return this.get(
      `/workspaces/${workspaceId}/users?memberships=WORKSPACE&page-size=5000`,
    );
  }

  async getWorkspaceById(id: string): Promise<Workspace> {
    const workspaces = await this.getWorkspaces();
    const workspace = workspaces.find((w) => w.id === id);
    if (!workspace) throw new BotError(BotErrorCode.WorkspaceNotFound);
    return workspace;
  }

  getProjectById(workspaceId: string, projectId: string): Promise<Project> {
    return this.get(`/workspaces/${workspaceId}/projects/${projectId}`);
  }

  async getUserById(workspaceId: string, userId: string): Promise<User> {
    const users = await this.getUsers(workspaceId);
    const user = users.find((u) => u.id === userId);
    if (!user) throw new BotError(BotErrorCode.UserNotFound);
    return user;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(path: string): Promise<any> {
    const apiKey = await this.interactions.getApiKey();
    if (!apiKey) throw new BotError(BotErrorCode.ApiKeyNotSet);

    const cacheId = `${path.includes("?") ? "&" : "?"}cache_id=${
      this.interactions.user.id
    }`;
    const response = await fetch(`${ClockifyAPI.BASE_URL}${path}${cacheId}`, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
      },
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: {
          "200-299": 60,
          "400-499": 5,
          "500-599": 0,
        },
      },
    });

    if (response.status === 401 || response.status === 403)
      throw new BotError(BotErrorCode.InvalidApiKey);
    if (response.status !== 200) throw new BotError(BotErrorCode.UnknownError);

    return response.json();
  }
}
