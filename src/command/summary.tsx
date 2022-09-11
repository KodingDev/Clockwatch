import { CommandHandler, createElement, Field, useDescription } from "slshx";
import { UserInteractions } from "../api/kv";
import { ErrorMessage, SuccessMessage } from "../discord/messages";
import { wrapClockifyBlock } from "../discord/clockify";
import {
  useProject,
  useTimeRangeOptional,
  useUserOptional,
  useWorkspace,
} from "../discord/hooks";
import { getProjectSummary, getWorkspaceSummary } from "../api/summary";
import { formatElapsed } from "../util/date";
import _, { round } from "lodash";
import { ReportData } from "../api/types/summary";

// TODO: Clean up this mess

function summaryProject(): CommandHandler<Env> {
  useDescription("Fetch clocked time summary for a specific project.");

  const workspaceId = useWorkspace("workspace", "The workspace to fetch.");
  const projectId = useProject("project", "The project to fetch.", workspaceId);
  const userId = useUserOptional("user", "The user to fetch.", workspaceId);
  const timeRange = useTimeRangeOptional("time", "The time range to fetch.");

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

      const range = timeRange.get();
      const timeEntries = await interactions.clockify.getTimeEntries(
        workspaceId,
        user.id,
        range.start,
        range.end,
      );

      const rate = interactions.clockify.getHourlyRate(workspace, user);
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
          Showing time entries for {timeRange.sentenceName} for {user.name}.
          <Field name="Time Entries">
            {summary
              .sort((a, b) => b.durationMS - a.durationMS)
              .map((value) => {
                const elapsed = formatElapsed(value.durationMS);
                const price = round(value.price, 2);
                return `**${value.description}** (${elapsed}): $${price}`;
              })
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
  const timeRange = useTimeRangeOptional("time", "The time range to fetch.");

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

      const range = timeRange.get();
      const timeEntries = await interactions.clockify.getTimeEntries(
        workspaceId,
        user.id,
        range.start,
        range.end,
      );

      const rate = interactions.clockify.getHourlyRate(workspace, user);
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
          Showing time entries for {timeRange.sentenceName} for `{user.name}`.
          {Object.entries(projectSummary).map(
            ([projectName, projectSummary]) => (
              <Field name={projectName}>
                {projectSummary
                  .sort((a, b) => b.durationMS - a.durationMS)
                  .map((value) => {
                    const elapsed = formatElapsed(value.durationMS);
                    const price = round(value.price, 2);
                    return `**${value.description}** (${elapsed}): $${price}`;
                  })
                  .join("\n")}
              </Field>
            ),
          )}
        </SuccessMessage>
      );
    });
  };
}

function summaryAll(): CommandHandler<Env> {
  useDescription("Fetch clocked time summary for all workspaces.");

  const timeRange = useTimeRangeOptional("time", "The time range to fetch.");

  return async function* (interaction, env) {
    const user = interaction.member?.user ?? interaction.user;
    if (!user) {
      return <ErrorMessage>Invalid user.</ErrorMessage>;
    }

    yield;

    const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);
    return wrapClockifyBlock(async () => {
      const workspaces = await interactions.clockify.getWorkspaces();
      if (!workspaces.length) {
        return <ErrorMessage>No workspaces found.</ErrorMessage>;
      }

      const user = await interactions.clockify.getUser();
      if (!user) {
        return <ErrorMessage>User not found.</ErrorMessage>;
      }

      const range = timeRange.get();
      const summaryPromises = await Promise.all(
        workspaces.map(async (workspace) => {
          const projects = await interactions.clockify.getProjects(
            workspace.id,
          );
          if (!projects.length) {
            return [];
          }

          const timeEntries = await interactions.clockify.getTimeEntries(
            workspace.id,
            user.id,
            range.start,
            range.end,
          );
          if (!timeEntries.length) {
            return [];
          }

          const rate = interactions.clockify.getHourlyRate(workspace, user);
          return _.chain(
            getWorkspaceSummary(timeEntries, projects, workspace, rate),
          )
            .sortBy((value) => -value.durationMS)
            .transform((result: ReportData[], value) => {
              result.push(value);
              return result.length < 5;
            })
            .value();
        }),
      );

      const summary = _.flatten(summaryPromises);
      if (!summary.length) {
        return <ErrorMessage>No time entries found.</ErrorMessage>;
      }

      const totalMoney = summary.reduce((a, b) => a + b.price, 0);
      const totalElapsed = summary.reduce((a, b) => a + b.durationMS, 0);

      return (
        <SuccessMessage
          author={`Summary • ${user.name}`}
          footer={`Total: $${round(totalMoney, 2)} • ${formatElapsed(
            totalElapsed,
          )}`}
        >
          Showing time entries for {timeRange.sentenceName}.
          {Object.entries(
            _.groupBy(summary, (value) => value.workspaceName),
          ).map(([workspaceName, workspaceSummary]) => (
            <Field name={workspaceName}>
              {workspaceSummary
                .sort((a, b) => b.durationMS - a.durationMS)
                .map((value) => {
                  const elapsed = formatElapsed(value.durationMS);
                  const price = round(value.price, 2);
                  return `\`${value.projectName}\` ${value.description} (${elapsed}): $${price}`;
                })
                .join("\n")}
            </Field>
          ))}
        </SuccessMessage>
      );
    });
  };
}

export const summary = {
  project: summaryProject,
  workspace: summaryWorkspace,
  all: summaryAll,
};
