import { UserInteractions } from "./interactions";
import { PayRate, Project, TimeEntry, User, Workspace } from "./types";
import { BotError, BotErrorCode } from "@/discord";

const UUID_REGEX = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", "i");

export class ClockifyAPI {
  private static readonly BASE_URL = "https://api.clockify.me/api/v1";

  constructor(private readonly interactions: UserInteractions) {}

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
   * Returns the hourly rate for a user in a workspace.
   * @param workspace The workspace to get the rate for
   * @param user The user to get the rate for
   */
  getHourlyRate(workspace: Workspace, user: User): PayRate | undefined {
    const workspaceRate = workspace.hourlyRate.amount === 0 ? undefined : workspace.hourlyRate;
    return workspace.memberships.find((value) => value.userId === user.id)?.hourlyRate ?? workspaceRate;
  }

  /**
   * Returns the current logged-in user.
   */
  getUser(): Promise<User> {
    return this.get("/user");
  }

  /**
   * Returns all workspaces the user has access to.
   */
  getWorkspaces(): Promise<Workspace[]> {
    return this.get("/workspaces");
  }

  /**
   * Returns all projects in a workspace.
   * @param workspaceId The workspace to get the projects for
   */
  getProjects(workspaceId: string): Promise<Project[]> {
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
  getTimeEntries(workspaceId: string, userId: string, start: Date, end: Date): Promise<TimeEntry[]> {
    return this.get(
      `/workspaces/${workspaceId}/user/${userId}/time-entries?page-size=5000&start=${start.toISOString()}&end=${end.toISOString()}&project-required=false&task-required=false`,
    );
  }

  /**
   * Returns all users in a workspace.
   * @param workspaceId The workspace to get the users for
   */
  getUsers(workspaceId: string): Promise<User[]> {
    return this.get(`/workspaces/${workspaceId}/users?memberships=WORKSPACE&page-size=5000`);
  }

  /**
   * Returns a workspace by the given ID.
   * @param id The ID of the workspace
   */
  async getWorkspaceById(id: string): Promise<Workspace> {
    const workspaces = await this.getWorkspaces();
    const workspace = workspaces.find((w) => w.id === id);
    if (!workspace) throw new BotError(BotErrorCode.WorkspaceNotFound);
    return workspace;
  }

  /**
   * Gets a project by the given ID.
   * @param workspaceId The workspace to get the project from
   * @param projectId The ID of the project
   */
  getProjectById(workspaceId: string, projectId: string): Promise<Project> {
    return this.get(`/workspaces/${workspaceId}/projects/${projectId}`);
  }

  /**
   * Get a user by the given ID.
   * @param workspaceId The workspace to get the user from
   * @param userId The ID of the user
   */
  async getUserById(workspaceId: string, userId: string): Promise<User> {
    const users = await this.getUsers(workspaceId);
    const user = users.find((u) => u.id === userId);
    if (!user) throw new BotError(BotErrorCode.UserNotFound);
    return user;
  }

  /**
   * Performs a GET request to the Clockify API.
   * This method automatically adds the API key to the request and
   * will cache the response for 1 minute.
   *
   * @param path The path to the endpoint
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(path: string): Promise<any> {
    const apiKey = await this.interactions.getApiKey();
    if (!apiKey) throw new BotError(BotErrorCode.ApiKeyNotSet);

    const cacheId = `${path.includes("?") ? "&" : "?"}cache_id=${this.interactions.user.id}`;
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

    if (response.status === 401 || response.status === 403) throw new BotError(BotErrorCode.InvalidApiKey);
    if (response.status !== 200) throw new BotError(BotErrorCode.UnknownError);

    return response.json();
  }
}
