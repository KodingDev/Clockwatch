import {
  CommandHandler,
  createElement,
  useDescription,
  useString,
} from "slshx";
import { UserInteractions } from "../api/kv";
import { ErrorMessage, InfoMessage } from "../discord/messages";

function setApiKey(): CommandHandler<Env> {
  useDescription("Sets your Clockify API key.");

  const apiKey = useString("key", "Your Clockify API key", {
    required: true,
  });

  return async (interaction, env) => {
    const user = interaction.member?.user ?? interaction.user;
    if (!user) {
      return <ErrorMessage>Invalid user.</ErrorMessage>;
    }

    const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);
    if (!interactions.clockify.validateApiKey(apiKey)) {
      return <ErrorMessage>Invalid API key.</ErrorMessage>;
    }

    await interactions.setApiKey(apiKey);
    return <InfoMessage>API key set.</InfoMessage>;
  };
}

export const settings = {
  setapikey: setApiKey,
};
