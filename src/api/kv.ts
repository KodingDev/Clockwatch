import { APIUser } from "discord-api-types/v9";
import { ClockifyAPI } from "./clockify";

export class UserInteractions {
  readonly clockify: ClockifyAPI;

  constructor(private readonly kv: KVNamespace, readonly user: APIUser) {
    this.clockify = new ClockifyAPI(this);
  }

  public async setApiKey(apiKey: string) {
    await this.kv.put(this.getKey("api_key"), apiKey);
  }

  public async getApiKey(): Promise<string | null> {
    return await this.kv.get(this.getKey("api_key"));
  }

  private getKey(entry: string): string {
    return `${this.user.id}:${entry}`;
  }
}
