import { CommandHandler, createElement, Field, useDescription } from "@zerite/slshx";
import {
  ErrorMessage,
  SuccessMessage,
  useProject,
  useTimeRangeOptional,
  useUserOptional,
  useWorkspace,
} from "@/discord";
import { estimateTotal, getProjectSummary, getWorkspaceSummary, ReportData, UserInteractions } from "@/clockify";
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

    const rate =
      interactions.clockify.getHourlyRate(workspace, user) ||
      project.hourlyRate ||
      (await interactions.getDefaultRateObject());

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
        footer={`Total: $${round(totalMoney, 2).toFixed(2)} • ${formatElapsed(totalElapsed)}`}
      >
        Showing time entries for {timeRange.sentenceName} for {user.name}.
        {estimatedTotal
          ? ` They are projected to earn $${round(estimatedTotal, 2).toFixed(2)} ${
              timeRange.sentenceName
            } on this project.`
          : ""}
        <Field name="Time Entries">
          {summary
            .sort((a, b) => b.durationMS - a.durationMS)
            .map((value) => {
              const elapsed = formatElapsed(value.durationMS);
              const price = round(value.price, 2).toFixed(2);
              return `**${value.description ?? "Unlabelled"}** (${elapsed}): $${price}`;
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
    const range = timeRange.get();
    const timeEntries = await interactions.clockify.getTimeEntries(workspaceId, user.id, range.start, range.end);

    const rate = interactions.clockify.getHourlyRate(workspace, user) || (await interactions.getDefaultRateObject());
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
        footer={`Total: $${round(totalMoney, 2).toFixed(2)} • ${formatElapsed(totalElapsed)}`}
      >
        Showing time entries for {timeRange.sentenceName} for `{user.name}`.
        {estimatedTotal
          ? ` They are projected to earn $${round(estimatedTotal, 2).toFixed(2)} ${timeRange.sentenceName}.`
          : ""}
        {Object.entries(projectSummary).map(([projectName, projectSummary]) => (
          <Field name={projectName}>
            {projectSummary
              .sort((a, b) => b.durationMS - a.durationMS)
              .map((value) => {
                const elapsed = formatElapsed(value.durationMS);
                const price = round(value.price, 2).toFixed(2);
                return `**${value.description ?? "Unlabelled"}** (${elapsed}): $${price}`;
              })
              .join("\n")}
          </Field>
        ))}
      </SuccessMessage>
    );
  };
}

function summaryWorkspaceUsers(): CommandHandler<Env> {
  useDescription("Fetch clocked time summary across all users");

  const workspaceId = useWorkspace("workspace", "The workspace to fetch.");
  const timeRange = useTimeRangeOptional("time", "The time range to fetch.");

  return async function* (interaction, env) {
    yield;

    const interactions = new UserInteractions(env.CLOCKWATCH_KV, getInteractionUser(interaction));

    const workspace = await interactions.clockify.getWorkspaceById(workspaceId);
    const projects = await interactions.clockify.getProjects(workspaceId);
    const range = timeRange.get();

    const summaries = _.flatten(
      await Promise.all(
        workspace.memberships.map(async (membership) => {
          if (membership.membershipType !== "WORKSPACE") return [];

          const user = await interactions.clockify.getUserById(workspaceId, membership.userId);
          const rate =
            interactions.clockify.getHourlyRate(workspace, user) || (await interactions.getDefaultRateObject());

          const timeEntries = await interactions.clockify.getTimeEntries(workspaceId, user.id, range.start, range.end);
          const summary = getWorkspaceSummary(timeEntries, projects, workspace, rate);
          return summary.map((value) => ({ ...value, userName: user.name } as ReportData));
        }),
      ),
    );

    if (!summaries.length) {
      return <ErrorMessage>No time entries found.</ErrorMessage>;
    }

    const userSummary = _.chain(summaries)
      .groupBy((value) => value.userName)
      .sortBy((value) => -value.reduce((a, b) => a + b.durationMS, 0))
      .value();

    const totalMoney = summaries.reduce((a, b) => a + b.price, 0);
    const totalElapsed = summaries.reduce((a, b) => a + b.durationMS, 0);
    const estimatedTotal = estimateTotal(summaries, timeRange);

    return (
      <SuccessMessage
        author={`Workspace User Summary • ${workspace.name}`}
        footer={`Total: $${round(totalMoney, 2).toFixed(2)} • ${formatElapsed(totalElapsed)}`}
      >
        Showing time entries for {timeRange.sentenceName} across all workspace users.
        {estimatedTotal
          ? ` The projected total is $${round(estimatedTotal, 2).toFixed(2)} ${timeRange.sentenceName}.`
          : ""}
        {userSummary.map((userSummary) => {
          const sorted = _.chain(userSummary)
            .sortBy((value) => -value.durationMS)
            .value();

          const display = sorted.slice(0, 3);
          const remaining = sorted.length - display.length;
          const remainingTotal = display.reduce((a, b) => a + b.price, 0);

          const remainingElapsed = display.reduce((a, b) => a + b.durationMS, 0);
          const totalElapsed = sorted.reduce((a, b) => a + b.durationMS, 0);
          const userTotal = display.reduce((a, b) => a + b.price, 0);

          const fieldName = `${userSummary[0].userName ?? "User"} - $${round(userTotal, 2).toFixed(
            2,
          )} • ${formatElapsed(totalElapsed)}`;
          return (
            <Field name={fieldName}>
              {display
                .map((value) => {
                  const elapsed = formatElapsed(value.durationMS);
                  const price = round(value.price, 2).toFixed(2);

                  const prefix = value.clientName.length ? `${value.clientName}: ` : "";
                  return ` **•** \`${prefix}${value.projectName}\` ${
                    value.description ?? "Other"
                  } (${elapsed}): $${price}`;
                })
                .join("\n")}
              {"\n"}
              {remaining > 0 &&
                `*...and ${remaining} more projects for $${round(remainingTotal, 2).toFixed(2)} (${formatElapsed(
                  remainingElapsed,
                )})*\n`}
            </Field>
          );
        })}
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
        const timeEntries = await interactions.clockify.getTimeEntries(workspace.id, user.id, range.start, range.end);
        if (!timeEntries.length) {
          return [];
        }

        const rate =
          interactions.clockify.getHourlyRate(workspace, user) || (await interactions.getDefaultRateObject());

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

    const progressDays = Math.ceil((Date.now() - range.start.getTime()) / (1000 * 60 * 60 * 24));
    const averageHoursPerDay = totalElapsed / progressDays / (1000 * 60 * 60);
    const averageHourlyRate = (totalMoney / totalElapsed) * (1000 * 60 * 60);

    const stats = [
      ["Avg. Hours/Day", `${round(averageHoursPerDay, 2).toFixed(2)} hours`],
      ["Avg. Hourly Rate", `$${round(averageHourlyRate, 2).toFixed(2)}/hr`],
    ];

    if (estimatedTotal) {
      stats.push(["Projected Earnings", `$${round(estimatedTotal, 2).toFixed(2)} ${timeRange.sentenceName}`]);
    }

    return (
      <SuccessMessage
        author={`Summary • ${user.name}`}
        footer={`Total: $${round(totalMoney, 2).toFixed(2)} • ${formatElapsed(totalElapsed)}`}
      >
        Showing time entries for {timeRange.sentenceName}.
        <Field name="Summary">{stats.map(([name, value]) => ` **•** \`${name}\`: ${value}`).join("\n")}</Field>
        {Object.entries(_.groupBy(summary, (value) => value.workspaceName)).map(([workspaceName, workspaceSummary]) => {
          const sortedProjects = _.chain(workspaceSummary)
            .sortBy((value) => -value.durationMS)
            .value();

          const display = sortedProjects.slice(0, 3);
          const remaining = sortedProjects.length - display.length;
          const remainingTotal = display.reduce((a, b) => a + b.price, 0);

          const remainingElapsed = display.reduce((a, b) => a + b.durationMS, 0);
          const totalElapsed = sortedProjects.reduce((a, b) => a + b.durationMS, 0);
          const totalMoney = sortedProjects.reduce((a, b) => a + b.price, 0);

          const fieldName = `${workspaceName} - $${round(totalMoney, 2).toFixed(2)} • ${formatElapsed(totalElapsed)}`;
          return (
            <Field name={fieldName}>
              {display
                .map((value) => {
                  const elapsed = formatElapsed(value.durationMS);
                  const price = round(value.price, 2).toFixed(2);

                  const prefix = value.clientName.length ? `${value.clientName}: ` : "";
                  return ` **•** \`${prefix}${value.projectName}\` ${
                    value.description ?? "Other"
                  } (${elapsed}): $${price}`;
                })
                .join("\n")}
              {"\n"}
              {remaining > 0 &&
                `*...and ${remaining} more projects for $${round(remainingTotal, 2).toFixed(2)} (${formatElapsed(
                  remainingElapsed,
                )})*\n`}
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
  workspaceusers: summaryWorkspaceUsers,
  all: summaryAll,
};
