import { APIUser } from "discord-api-types/v9";
import { ClockifyAPI } from "./api";
import { CurrencyPair, User, Workspace } from "@/clockify/types";
import { round } from "lodash";
import { Currency } from "@/api/currency";

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

  /**
   * Sets the default rate for the user.
   * @param amount The rate to set.
   */
  public async setDefaultRate(amount: number) {
    if (amount < 0 || amount > 1000) {
      throw new Error("Rate must be positive and within 0-1000.");
    }

    const rounded = round(amount, 2);
    await this.kv.put(this.getKey("default_rate"), rounded.toString());
  }

  /**
   * Gets the default rate for the user.
   */
  public async getDefaultRate(): Promise<number> {
    const rate = await this.kv.get(this.getKey("default_rate"));
    if (!rate) {
      return 0;
    }

    return parseFloat(rate);
  }

  /**
   * Gets the user's default rate in object form.
   */
  public async getDefaultRateObject(): Promise<CurrencyPair> {
    return {
      amount: Math.round((await this.getDefaultRate()) * 100),
      currency: Currency.USD,
    };
  }

  public async getHourlyRate(workspace: Workspace, user: User): Promise<CurrencyPair> {
    const hourlyRate = await this.clockify.getHourlyRate(workspace, user);
    if (hourlyRate) return hourlyRate;

    return await this.getDefaultRateObject();
  }

  public async getUserOrSelf(workspaceId: string, userId?: string | null): Promise<User> {
    return userId ? await this.clockify.getUserById(workspaceId, userId) : await this.clockify.getUser();
  }

  private getKey(entry: string): string {
    return `${this.user.id}:${entry}`;
  }
}
