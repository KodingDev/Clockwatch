import { BotError, BotErrorCode } from "@/discord";

export abstract class APIClient {
  protected constructor(private readonly base: string) {}

  abstract getCacheId(): Promise<string>;

  abstract getHeaders(): Promise<Record<string, string>>;

  /**
   * Performs a GET request to an API.
   * This method automatically adds the any headers to the request and
   * will cache the response for 1 minute.
   *
   * @param path The path to the endpoint
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(path: string): Promise<any> {
    const id = await this.getCacheId();
    const headers = await this.getHeaders();

    const cacheId = `${path.includes("?") ? "&" : "?"}cache_id=${id}`;
    const response = await fetch(`${this.base}${path}${cacheId}`, {
      method: "GET",
      headers: headers,
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
    if (response.status !== 200)
      throw new BotError(BotErrorCode.UnknownError, `API returned status code ${response.status}`);

    return response.json();
  }
}
