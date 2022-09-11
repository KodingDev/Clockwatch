import { APIChatInputApplicationCommandInteraction } from "discord-api-types";
import { BotError, BotErrorCode } from "@/discord";

export const getInteractionUser = (
  interaction: APIChatInputApplicationCommandInteraction,
) => {
  const user = interaction.member?.user ?? interaction.user;
  if (!user) throw new BotError(BotErrorCode.InvalidInteraction);
  return user;
};
