import { APIUser } from "discord-api-types/v9";
import { ClockifyAPI } from "./api";

/**
 * Handles mostly KV interactions with Cloudflare and passes
 * the data to the Clockify API.
 */
export class UserInteractions {
  readonly clockify: ClockifyAPI;

  constructor(private readonly kv: KVNamespace, readonly user: APIUser) {
    this.clockify = new ClockifyAPI(this);
  }

  /**
   * Validates the API key and updates the KV store.
   * @param apiKey The API key to validate.
   */
  public async setApiKey(apiKey: string) {
    this.clockify.validateApiKey(apiKey);
    await this.kv.put(this.getKey("api_key"), apiKey);
  }

  /**
   * Gets the API key from the KV store.
   */
  public async getApiKey(): Promise<string | null> {
    return await this.kv.get(this.getKey("api_key"));
  }

  private getKey(entry: string): string {
    return `${this.user.id}:${entry}`;
  }
}
