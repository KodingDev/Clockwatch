import { CommandHandler, createElement, Field, useDescription } from "slshx";
import { UserInteractions } from "../api/kv";
import { ErrorMessage, SuccessMessage } from "../discord/messages";
import { wrapClockifyBlock } from "../discord/clockify";
import { useProject, useUserOptional, useWorkspace } from "../discord/hooks";
import { getProjectSummary } from "../api/summary";
import { formatElapsed } from "../util/date";
import { round } from "lodash";

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

function summaryProject(): CommandHandler<Env> {
  useDescription("Fetch clocked time summary for a specific project.");

  const workspaceId = useWorkspace("workspace", "The workspace to fetch.");
  const projectId = useProject("project", "The project to fetch.", workspaceId);
  const userId = useUserOptional("user", "The user to fetch.", workspaceId);

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

      const user = userId
        ? await interactions.clockify.getUserById(workspaceId, userId)
        : await interactions.clockify.getUser();
      if (!user) {
        return <ErrorMessage>User not found.</ErrorMessage>;
      }

      const project = await interactions.clockify.getProjectById(
        workspaceId,
        projectId,
      );
      if (!project) {
        return <ErrorMessage>Project not found.</ErrorMessage>;
      }

      const timeEntries = await interactions.clockify.getTimeEntries(
        workspaceId,
        user.id,
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        new Date(),
      );

      // TODO: Alternate currencies
      const rate = workspace.memberships.find(
        (value) => value.userId === user.id,
      )?.hourlyRate ?? { amount: 0, currency: "USD" };
      const summary = getProjectSummary(timeEntries, project, rate);

      if (!summary.length) {
        return <ErrorMessage>No time entries found.</ErrorMessage>;
      }

      const totalMoney = summary.reduce((a, b) => a + b.price, 0);
      const totalElapsed = summary.reduce((a, b) => a + b.durationMS, 0);

      return (
        <SuccessMessage
          author={`Project Summary » ${project.name}`}
          footer={`Total: $${round(totalMoney, 2)} • ${formatElapsed(
            totalElapsed,
          )}`}
        >
          Showing time entries for the last 7 days for `{user.name}`.
          <Field name="Time Entries">
            {summary
              .sort((a, b) => b.durationMS - a.durationMS)
              .map(
                (value) =>
                  `**${value.description}** (${formatElapsed(
                    value.durationMS,
                  )}): $${round(value.price, 2)}`,
              )
              .join("\n")}
          </Field>
        </SuccessMessage>
      );
    });
  };
}

export const workspace = {
  info,
  summary: {
    project: summaryProject,
  },
};
