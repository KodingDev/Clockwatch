import {
  CommandHandler,
  createElement,
  useDescription,
  useString,
} from "slshx";
import { UserInteractions } from "../api/kv";
import clockify from "../api/clockify";
import { ErrorMessage, SuccessMessage } from "../discord/messages";

// `Env` contains bindings and is declared in types/env.d.ts
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

    if (!clockify.validateApiKey(apiKey)) {
      return <ErrorMessage>Invalid API key.</ErrorMessage>;
    }

    const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);
    await interactions.setApiKey(apiKey);
    return <SuccessMessage>API key set.</SuccessMessage>;
  };
}

export const settings = {
  setapikey: setApiKey,
};
