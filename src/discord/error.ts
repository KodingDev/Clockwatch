export enum BotErrorCode {
  // Clockify
  InvalidApiKey = "InvalidApiKey",
  ApiKeyNotSet = "ApiKeyNotSet",
  WorkspaceNotFound = "WorkspaceNotFound",
  UserNotFound = "UserNotFound",

  // Discord
  InvalidInteraction = "InvalidInteraction",

  // Fallback
  UnknownError = "UnknownError",
}

const ErrorMessages: Record<BotErrorCode, string> = {
  // Clockify
  [BotErrorCode.InvalidApiKey]:
    "Invalid API key. Please check your API key is correct and try again.",
  [BotErrorCode.ApiKeyNotSet]:
    "You have not set an API key. Please set one using </settings setapikey:1017089178955153559> and re-run the command.",
  [BotErrorCode.WorkspaceNotFound]: "Workspace not found.",
  [BotErrorCode.UserNotFound]: "User not found.",

  // Discord
  [BotErrorCode.InvalidInteraction]: "Invalid interaction. Please try again.",

  // Fallback
  [BotErrorCode.UnknownError]:
    "An unknown error occurred. Please report this to the bot developer.",
};

export class BotError extends Error {
  constructor(public readonly code: BotErrorCode) {
    super(ErrorMessages[code]);
  }
}
