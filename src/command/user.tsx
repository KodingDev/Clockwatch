import { CommandHandler, createElement, Field, useDescription } from "slshx";
import { UserInteractions } from "../api/kv";
import { ErrorMessage, SuccessMessage } from "../discord/messages";
import { wrapClockifyBlock } from "../discord/clockify";

export function user(): CommandHandler<Env> {
  useDescription("Fetch your user information.");

  return async (interaction, env) => {
    const user = interaction.member?.user ?? interaction.user;
    if (!user) {
      return <ErrorMessage>Invalid user.</ErrorMessage>;
    }

    const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);
    return wrapClockifyBlock(async () => {
      const user = await interactions.clockify.getUser();
      const workspaces = await interactions.clockify.getWorkspaces();

      return (
        <SuccessMessage title="User">
          You are signed in as `{user.name}`.
          <Field name="Workspaces">
            {workspaces.map((value) => value.name).join(", ")}
          </Field>
        </SuccessMessage>
      );
    });
  };
}
