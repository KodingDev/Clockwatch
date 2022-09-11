import { APIChatInputApplicationCommandInteraction } from "discord-api-types";
import { BotError, BotErrorCode } from "@/discord";
import { APIApplicationCommandAutocompleteInteraction } from "discord-api-types/payloads/v9/_interactions/autocomplete";

export const getInteractionUser = (
  interaction: APIChatInputApplicationCommandInteraction | APIApplicationCommandAutocompleteInteraction,
) => {
  const user = interaction.member?.user ?? interaction.user;
  if (!user) throw new BotError(BotErrorCode.InvalidInteraction);
  return user;
};
