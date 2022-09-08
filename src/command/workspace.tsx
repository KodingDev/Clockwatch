import { CommandHandler, createElement, Field, useDescription } from "slshx";
import { UserInteractions } from "../api/kv";
import { ErrorMessage, SuccessMessage } from "../discord/messages";
import { wrapClockifyBlock } from "../discord/clockify";
import { useWorkspace } from "../discord/hooks";

function info(): CommandHandler<Env> {
  useDescription("Fetch information on a specific workspace.");
  const workspaceId = useWorkspace("name", "The workspace to fetch.");
  return async (interaction, env) => {
    const user = interaction.member?.user ?? interaction.user;
    if (!user) {
      return <ErrorMessage>Invalid user.</ErrorMessage>;
    }

    const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);
    return wrapClockifyBlock(async () => {
      const workspace = await interactions.clockify.getWorkspaceById(
        workspaceId,
      );
      if (!workspace) {
        return <ErrorMessage>Workspace not found.</ErrorMessage>;
      }

      const projects = await interactions.clockify.getProjects(workspace.id);
      return (
        <SuccessMessage title="Workspace">
          The workspace `{workspace.name}` has {workspace.memberships.length}{" "}
          members.
          <Field name={`Projects (${projects.length})`}>
            {projects.map((value) => value.name).join(", ")}
          </Field>
        </SuccessMessage>
      );
    });
  };
}

export const workspace = {
  info,
};
