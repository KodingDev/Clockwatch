export enum BotErrorCode {
  // Clockify
  InvalidApiKey = "InvalidApiKey",
  ApiKeyNotSet = "ApiKeyNotSet",
  WorkspaceNotFound = "WorkspaceNotFound",
  UserNotFound = "UserNotFound",
  NoWorkspacesFound = "NoWorkspacesFound",
  NoTimeEntries = "NoTimeEntries",

  // Discord
  InvalidInteraction = "InvalidInteraction",

  // Fallback
  UnknownError = "UnknownError",
}

const ErrorMessages: Record<BotErrorCode, string> = {
  // Clockify
  [BotErrorCode.InvalidApiKey]: "Invalid API key. Please check your API key is correct and try again.",
  [BotErrorCode.ApiKeyNotSet]:
    "You have not set an API key. Please set one using </settings setapikey:1017089178955153559> and re-run the command. You can find your API key [here](https://app.clockify.me/user/settings) at the bottom of the page.",
  [BotErrorCode.WorkspaceNotFound]: "Workspace not found.",
  [BotErrorCode.UserNotFound]: "User not found.",
  [BotErrorCode.NoWorkspacesFound]: "You do not have access to any workspaces.",
  [BotErrorCode.NoTimeEntries]: "No time entries found.",

  // Discord
  [BotErrorCode.InvalidInteraction]: "Invalid interaction. Please try again.",

  // Fallback
  [BotErrorCode.UnknownError]: "An unknown error occurred. Please report this to the bot developer.",
};

export class BotError extends Error {
  constructor(public readonly code: BotErrorCode, public readonly debug?: string) {
    super(ErrorMessages[code]);
  }
}
