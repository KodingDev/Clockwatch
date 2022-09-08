import { CommandHandler, createElement, Field, useDescription } from "slshx";
import { UserInteractions } from "../api/kv";
import { ErrorMessage, SuccessMessage } from "../discord/messages";
import { wrapClockifyBlock } from "../discord/clockify";
import { useProject, useUserOptional, useWorkspace } from "../discord/hooks";
import { getProjectSummary, getWorkspaceSummary } from "../api/summary";
import { formatElapsed } from "../util/date";
import _, { round } from "lodash";

function summaryProject(): CommandHandler<Env> {
  useDescription("Fetch clocked time summary for a specific project.");

  const workspaceId = useWorkspace("workspace", "The workspace to fetch.");
  const projectId = useProject("project", "The project to fetch.", workspaceId);
  const userId = useUserOptional("user", "The user to fetch.", workspaceId);

  return async function* (interaction, env) {
    const user = interaction.member?.user ?? interaction.user;
    if (!user) {
      return <ErrorMessage>Invalid user.</ErrorMessage>;
    }

    yield;

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
          author={`Project Summary • ${project.name}`}
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

function summaryWorkspace(): CommandHandler<Env> {
  useDescription("Fetch clocked time summary for a specific workspace.");

  const workspaceId = useWorkspace("workspace", "The workspace to fetch.");
  const userId = useUserOptional("user", "The user to fetch.", workspaceId);

  return async function* (interaction, env) {
    const user = interaction.member?.user ?? interaction.user;
    if (!user) {
      return <ErrorMessage>Invalid user.</ErrorMessage>;
    }

    yield;

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

      const projects = await interactions.clockify.getProjects(workspaceId);
      if (!projects.length) {
        return <ErrorMessage>No projects found.</ErrorMessage>;
      }

      // TODO: Custom time range
      const timeEntries = await interactions.clockify.getTimeEntries(
        workspaceId,
        user.id,
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        new Date(),
      );

      const rate = workspace.memberships.find(
        (value) => value.userId === user.id,
      )?.hourlyRate ?? { amount: 0, currency: "USD" };
      const summary = getWorkspaceSummary(
        timeEntries,
        projects,
        workspace,
        rate,
      );

      if (!summary.length) {
        return <ErrorMessage>No time entries found.</ErrorMessage>;
      }

      const projectSummary = _.groupBy(summary, (value) => value.projectName);
      const totalMoney = summary.reduce((a, b) => a + b.price, 0);
      const totalElapsed = summary.reduce((a, b) => a + b.durationMS, 0);

      return (
        <SuccessMessage
          author={`Workspace Summary • ${workspace.name}`}
          footer={`Total: $${round(totalMoney, 2)} • ${formatElapsed(
            totalElapsed,
          )}`}
        >
          Showing time entries for the last 7 days for `{user.name}`.
          {Object.entries(projectSummary).map(
            ([projectName, projectSummary]) => (
              <Field name={projectName}>
                {projectSummary
                  .sort((a, b) => b.durationMS - a.durationMS)
                  .map(
                    (value) =>
                      `**${value.description}** (${formatElapsed(
                        value.durationMS,
                      )}): $${round(value.price, 2)}`,
                  )
                  .join("\n")}
              </Field>
            ),
          )}
        </SuccessMessage>
      );
    });
  };
}

export const summary = {
  project: summaryProject,
  workspace: summaryWorkspace,
};
