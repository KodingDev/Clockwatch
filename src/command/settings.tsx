import {
  CommandHandler,
  createElement,
  useDescription,
  useString,
} from "@zerite/slshx";
import { UserInteractions } from "../api/kv";
import { InfoMessage } from "../discord/messages";
import { getInteractionUser } from "../util/discord";

function setApiKey(): CommandHandler<Env> {
  useDescription("Sets your Clockify API key.");

  const apiKey = useString("key", "Your Clockify API key", {
    required: true,
  });

  return async (interaction, env) => {
    const user = getInteractionUser(interaction);
    const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);
    await interactions.setApiKey(apiKey);
    return <InfoMessage>API key set.</InfoMessage>;
  };
}

export const settings = {
  setapikey: setApiKey,
};
