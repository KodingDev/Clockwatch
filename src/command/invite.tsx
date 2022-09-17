import { CommandHandler, createElement, useDescription } from "@zerite/slshx";
import { InfoMessage } from "@/discord/components";

export function invite(): CommandHandler<Env> {
  useDescription("Invite the bot to your server");

  return async (interaction) => {
    const invite = `https://discord.com/api/oauth2/authorize?client_id=${interaction.application_id}&permissions=0&scope=bot%20applications.commands`;
    return (
      <InfoMessage ephemeral={false}>
        You can invite the bot to your server by [clicking here]({invite}). 💖
      </InfoMessage>
    );
  };
}
