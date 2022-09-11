import { CommandHandler, createElement, Field, useDescription } from "@zerite/slshx";
import {
  ErrorMessage,
  SuccessMessage,
  useProject,
  useTimeRangeOptional,
  useUserOptional,
  useWorkspace,
} from "@/discord";
import { estimateTotal, getProjectSummary, getWorkspaceSummary, UserInteractions } from "@/clockify";
import { formatElapsed, getInteractionUser } from "@/util";
import _, { round } from "lodash";

function summaryProject(): CommandHandler<Env> {
  useDescription("Fetch clocked time summary for a specific project.");

  const workspaceId = useWorkspace("workspace", "The workspace to fetch.");
  const projectId = useProject("project", "The project to fetch.", workspaceId);
  const userId = useUserOptional("user", "The user to fetch.", workspaceId);
  const timeRange = useTimeRangeOptional("time", "The time range to fetch.");

  return async function* (interaction, env) {
    yield;

    const interactions = new UserInteractions(env.CLOCKWATCH_KV, getInteractionUser(interaction));

    const workspace = await interactions.clockify.getWorkspaceById(workspaceId);
    const user = userId
      ? await interactions.clockify.getUserById(workspaceId, userId)
      : await interactions.clockify.getUser();

    const project = await interactions.clockify.getProjectById(workspaceId, projectId);

    const range = timeRange.get();
    const timeEntries = await interactions.clockify.getTimeEntries(workspaceId, user.id, range.start, range.end);

    let rate = interactions.clockify.getHourlyRate(workspace, user);
    if (rate.amount === 0) rate = project.hourlyRate;

    const summary = getProjectSummary(timeEntries, project, rate);
    if (!summary.length) {
      return <ErrorMessage>No time entries found.</ErrorMessage>;
    }

    const totalMoney = summary.reduce((a, b) => a + b.price, 0);
    const totalElapsed = summary.reduce((a, b) => a + b.durationMS, 0);
    const estimatedTotal = estimateTotal(summary, timeRange);

    return (
      <SuccessMessage
        author={`Project Summary • ${project.name}`}
        footer={`Total: $${round(totalMoney, 2)} • ${formatElapsed(totalElapsed)}`}
      >
        Showing time entries for {timeRange.sentenceName} for {user.name}.
        {estimatedTotal &&
          ` They are projected to earn $${round(estimatedTotal, 2)} ${timeRange.sentenceName} on this project.`}
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
  };
}

function summaryWorkspace(): CommandHandler<Env> {
  useDescription("Fetch clocked time summary for a specific workspace.");

  const workspaceId = useWorkspace("workspace", "The workspace to fetch.");
  const userId = useUserOptional("user", "The user to fetch.", workspaceId);
  const timeRange = useTimeRangeOptional("time", "The time range to fetch.");

  return async function* (interaction, env) {
    yield;

    const interactions = new UserInteractions(env.CLOCKWATCH_KV, getInteractionUser(interaction));

    const workspace = await interactions.clockify.getWorkspaceById(workspaceId);
    const user = userId
      ? await interactions.clockify.getUserById(workspaceId, userId)
      : await interactions.clockify.getUser();

    const projects = await interactions.clockify.getProjects(workspaceId);
    if (!projects.length) {
      return <ErrorMessage>No projects found.</ErrorMessage>;
    }

    const range = timeRange.get();
    const timeEntries = await interactions.clockify.getTimeEntries(workspaceId, user.id, range.start, range.end);

    const rate = interactions.clockify.getHourlyRate(workspace, user);
    const summary = getWorkspaceSummary(timeEntries, projects, workspace, rate);

    if (!summary.length) {
      return <ErrorMessage>No time entries found.</ErrorMessage>;
    }

    const projectSummary = _.groupBy(summary, (value) => value.projectName);
    const totalMoney = summary.reduce((a, b) => a + b.price, 0);
    const totalElapsed = summary.reduce((a, b) => a + b.durationMS, 0);
    const estimatedTotal = estimateTotal(summary, timeRange);

    return (
      <SuccessMessage
        author={`Workspace Summary • ${workspace.name}`}
        footer={`Total: $${round(totalMoney, 2)} • ${formatElapsed(totalElapsed)}`}
      >
        Showing time entries for {timeRange.sentenceName} for `{user.name}`.
        {estimatedTotal && ` They are projected to earn $${round(estimatedTotal, 2)} ${timeRange.sentenceName}.`}
        {Object.entries(projectSummary).map(([projectName, projectSummary]) => (
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
        ))}
      </SuccessMessage>
    );
  };
}

function summaryAll(): CommandHandler<Env> {
  useDescription("Fetch clocked time summary for all workspaces.");

  const timeRange = useTimeRangeOptional("time", "The time range to fetch.");

  return async function* (interaction, env) {
    yield;

    const interactions = new UserInteractions(env.CLOCKWATCH_KV, getInteractionUser(interaction));

    const workspaces = await interactions.clockify.getWorkspaces();
    if (!workspaces.length) {
      return <ErrorMessage>No workspaces found.</ErrorMessage>;
    }

    const user = await interactions.clockify.getUser();
    const range = timeRange.get();

    const summaryPromises = await Promise.all(
      workspaces.map(async (workspace) => {
        const projects = await interactions.clockify.getProjects(workspace.id);
        if (!projects.length) {
          return [];
        }

        const timeEntries = await interactions.clockify.getTimeEntries(workspace.id, user.id, range.start, range.end);
        if (!timeEntries.length) {
          return [];
        }

        const rate = interactions.clockify.getHourlyRate(workspace, user);
        return _.chain(getWorkspaceSummary(timeEntries, projects, workspace, rate))
          .filter((value) => value.price > 0)
          .sortBy((value) => -value.durationMS)
          .value();
      }),
    );

    const summary = _.flatten(summaryPromises);
    if (!summary.length) {
      return <ErrorMessage>No time entries found.</ErrorMessage>;
    }

    const totalMoney = summary.reduce((a, b) => a + b.price, 0);
    const totalElapsed = summary.reduce((a, b) => a + b.durationMS, 0);
    const estimatedTotal = estimateTotal(summary, timeRange);

    return (
      <SuccessMessage
        author={`Summary • ${user.name}`}
        footer={`Total: $${round(totalMoney, 2)} • ${formatElapsed(totalElapsed)}`}
      >
        Showing time entries for {timeRange.sentenceName}.
        {estimatedTotal && ` They are projected to earn $${round(estimatedTotal, 2)} ${timeRange.sentenceName}.`}
        {Object.entries(_.groupBy(summary, (value) => value.workspaceName)).map(([workspaceName, workspaceSummary]) => {
          const sortedProjects = _.chain(workspaceSummary)
            .sortBy((value) => -value.durationMS)
            .value();

          const display = sortedProjects.slice(0, 5);
          const remaining = sortedProjects.length - display.length;
          const remainingTotal = sortedProjects.slice(5).reduce((a, b) => a + b.price, 0);

          const remainingElapsed = sortedProjects.slice(5).reduce((a, b) => a + b.durationMS, 0);
          const totalElapsed = sortedProjects.reduce((a, b) => a + b.durationMS, 0);

          return (
            <Field name={workspaceName}>
              {display
                .map((value) => {
                  const elapsed = formatElapsed(value.durationMS);
                  const price = round(value.price, 2);
                  return `\`${value.projectName}\` **${value.description}** (${elapsed}) - $${price}`;
                })
                .join("\n")}
              {"\n"}
              {remaining > 0 &&
                `*...and ${remaining} more projects for $${round(remainingTotal, 2)} (${formatElapsed(
                  remainingElapsed,
                )})*\n`}
              {"\n"}**Total**: $
              {round(
                workspaceSummary.reduce((a, b) => a + b.price, 0),
                2,
              )}{" "}
              • {formatElapsed(totalElapsed)}
            </Field>
          );
        })}
      </SuccessMessage>
    );
  };
}

export const summary = {
  project: summaryProject,
  workspace: summaryWorkspace,
  all: summaryAll,
};
