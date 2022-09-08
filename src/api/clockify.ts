import { UserInteractions } from "./kv";
import { User, Workspace } from "./types/clockify";

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

  getUser(): Promise<User> {
    return this.get("/user");
  }

  getWorkspaces(): Promise<Workspace[]> {
    return this.get("/workspaces");
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
