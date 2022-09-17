import { CommandHandler, createElement, useDescription, useNumber, useString } from "@zerite/slshx";
import { UserInteractions } from "@/clockify";
import { getInteractionUser } from "@/util";
import { InfoMessage } from "@/discord/components";

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

function setDefaultRate(): CommandHandler<Env> {
  useDescription("Sets your default hourly rate when a workspace doesn't specify one.");

  const rate = useNumber("rate", "Your default hourly rate", {
    required: true,
    min: 0,
    max: 1000,
  });

  return async (interaction, env) => {
    const user = getInteractionUser(interaction);
    const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);
    await interactions.setDefaultRate(rate);
    return <InfoMessage>Default rate set.</InfoMessage>;
  };
}

export const settings = {
  setapikey: setApiKey,
  setdefaultrate: setDefaultRate,
};
