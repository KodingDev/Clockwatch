import { CommandHandler, createElement, Field, useDescription } from "@zerite/slshx";
import { UserInteractions } from "@/clockify";
import { getInteractionUser } from "@/util";
import { SuccessMessage } from "@/discord";

export function user(): CommandHandler<Env> {
  useDescription("Fetch your user information.");

  return async (interaction, env) => {
    const interactions = new UserInteractions(env.CLOCKWATCH_KV, getInteractionUser(interaction));

    const user = await interactions.clockify.getUser();
    const workspaces = await interactions.clockify.getWorkspaces();

    return (
      <SuccessMessage title="User">
        You are signed in as `{user.name}`.
        <Field name="Workspaces">{workspaces.map((value) => value.name).join(", ")}</Field>
      </SuccessMessage>
    );
  };
}
