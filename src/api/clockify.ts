import { UserInteractions } from "./kv";
import { PayRate, Project, TimeEntry, User, Workspace } from "./types/clockify";

const uuidRegex = new RegExp(
  "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
  "i",
);

export class ClockifyError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export class ClockifyAPI {
  private static readonly BASE_URL = "https://api.clockify.me/api/v1";

  constructor(private readonly interactions: UserInteractions) {}

  validateApiKey(apiKey: string): boolean {
    // Decode the key as base64
    let uuid;

    try {
      uuid = atob(apiKey);
    } catch (e) {
      return false;
    }

    // Check if the decoded key is a valid UUID
    return uuidRegex.test(uuid);
  }

  getHourlyRate(workspace: Workspace, user: User): PayRate {
    return (
      workspace.memberships.find((value) => value.userId === user.id)
        ?.hourlyRate ?? { amount: 0, currency: "USD" }
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

  async getWorkspaceById(id: string): Promise<Workspace | undefined> {
    const workspaces = await this.getWorkspaces();
    return workspaces.find((w) => w.id === id);
  }

  getProjectById(workspaceId: string, projectId: string): Promise<Project> {
    return this.get(`/workspaces/${workspaceId}/projects/${projectId}`);
  }

  async getUserById(
    workspaceId: string,
    userId: string,
  ): Promise<User | undefined> {
    const users = await this.getUsers(workspaceId);
    return users.find((u) => u.id === userId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(path: string): Promise<any> {
    const apiKey = await this.interactions.getApiKey();
    if (!apiKey) throw new ClockifyError("No API key set", 400);

    const response = await fetch(`${ClockifyAPI.BASE_URL}${path}`, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
      },
      cf: {
        cacheKey: `${this.interactions.user.id}:${path}`,
        cacheTtlByStatus: {
          "200-299": 60,
          "400-499": 5,
          "500-599": 0,
        },
      },
    });

    if (response.status === 401)
      throw new ClockifyError("API key is not set or invalid.", 401);
    if (response.status === 403)
      throw new ClockifyError("API key is not valid.", 403);
    if (response.status !== 200)
      throw new ClockifyError("Unknown error.", response.status);

    return response.json();
  }
}
