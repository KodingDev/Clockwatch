import { APIUser } from "discord-api-types/v9";

export class UserInteractions {
  constructor(
    private readonly kv: KVNamespace,
    private readonly user: APIUser,
  ) {}

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
