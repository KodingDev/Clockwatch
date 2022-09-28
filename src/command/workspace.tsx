import { CommandHandler, createElement, Field, useDescription } from "@zerite/slshx";
import { useWorkspace } from "@/discord";
import { getInteractionUser } from "@/util";
import { SuccessMessage } from "@/discord/components";
import { UserInteractions } from "@/api";

function info(): CommandHandler<Env> {
  useDescription("Fetch information on a specific workspace.");
  const workspaceId = useWorkspace("name", "The workspace to fetch.");
  return async (interaction, env) => {
    const interactions = new UserInteractions(env.CLOCKWATCH_KV, getInteractionUser(interaction));

    const workspace = await interactions.clockify.getWorkspaceById(workspaceId);
    const projects = await interactions.clockify.getProjects(workspace.id);

    return (
      <SuccessMessage title="Workspace">
        The workspace `{workspace.name}` has {workspace.users?.length ?? 0} members.
        <Field name={`Projects (${projects.length})`}>{projects.map((value) => value.name).join(", ")}</Field>
      </SuccessMessage>
    );
  };
}

export const workspace = {
  info,
};
