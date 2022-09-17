import { CommandHandler, createElement, Field, useDescription } from "@zerite/slshx";
import { BotError, BotErrorCode, useProject, useTimeRangeOptional, useUserOptional, useWorkspace } from "@/discord";
import {
  estimateTotal,
  getProjectSummary,
  getSummaryTotals,
  getWorkspaceSummary,
  ReportData,
  UserInteractions,
} from "@/clockify";
import { formatElapsed, getInteractionUser } from "@/util";
import _, { round } from "lodash";
import { ReportDataSummaryField } from "@/discord/components/summary";
import { SuccessMessage } from "@/discord/components";

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
    const user = await interactions.getUserOrSelf(workspaceId, userId);
    const project = await interactions.clockify.getProjectById(workspaceId, projectId);
    const timeEntries = await interactions.clockify.getTimeEntriesFromRange(workspaceId, user.id, timeRange.get());

    const rate = project.hourlyRate ?? (await interactions.getHourlyRate(workspace, user));
    const summary = getProjectSummary(timeEntries, project, rate);
    if (!summary.length) throw new BotError(BotErrorCode.NoTimeEntries);

    const { elapsed: totalElapsed, money: totalMoney } = getSummaryTotals(summary);
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
        <ReportDataSummaryField
          data={summary}
          titleProvider={(elapsed, price) =>
            `Time Entries - $${round(price, 2).toFixed(2)} • ${formatElapsed(elapsed)}`
          }
        />
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
    const user = await interactions.getUserOrSelf(workspaceId, userId);
    const projects = await interactions.clockify.getProjects(workspaceId);
    const timeEntries = await interactions.clockify.getTimeEntriesFromRange(workspaceId, user.id, timeRange.get());

    const rate = await interactions.getHourlyRate(workspace, user);
    const summary = getWorkspaceSummary(timeEntries, projects, workspace, rate);
    if (!summary.length) throw new BotError(BotErrorCode.NoTimeEntries);

    const projectSummary = _.groupBy(summary, (value) => value.projectName);
    const { elapsed: totalElapsed, money: totalMoney } = getSummaryTotals(summary);
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
          <ReportDataSummaryField
            data={projectSummary}
            titleProvider={(elapsed, price) => `${projectName} - ${formatElapsed(elapsed)} • $${round(price, 2)}`}
          />
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
          const rate = await interactions.getHourlyRate(workspace, user);

          const timeEntries = await interactions.clockify.getTimeEntriesFromRange(workspaceId, user.id, range);
          const summary = getWorkspaceSummary(timeEntries, projects, workspace, rate);
          return summary.map((value) => ({ ...value, userName: user.name } as ReportData));
        }),
      ),
    );

    if (!summaries.length) throw new BotError(BotErrorCode.NoTimeEntries);
    const userSummary = _.chain(summaries)
      .groupBy((value) => value.userName)
      .sortBy((value) => -value.reduce((a, b) => a + b.durationMS, 0))
      .value();

    const { elapsed: totalElapsed, money: totalMoney } = getSummaryTotals(summaries);
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
        {userSummary.map((userSummary) => (
          <ReportDataSummaryField
            data={userSummary}
            titleProvider={(elapsed, price) =>
              `${userSummary[0].userName ?? "User"} - $${round(price, 2).toFixed(2)} • ${formatElapsed(elapsed)}`
            }
          />
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
    const user = await interactions.clockify.getUser();
    const range = timeRange.get();

    const summaryPromises = await Promise.all(
      workspaces.map(async (workspace) => {
        const projects = await interactions.clockify.getProjects(workspace.id);
        const timeEntries = await interactions.clockify.getTimeEntriesFromRange(workspace.id, user.id, range);
        if (!timeEntries.length) return [];

        const rate = await interactions.getHourlyRate(workspace, user);
        return _.chain(getWorkspaceSummary(timeEntries, projects, workspace, rate))
          .filter((value) => value.price > 0)
          .sortBy((value) => -value.durationMS)
          .value();
      }),
    );

    const summary = _.flatten(summaryPromises);
    if (!summary.length) throw new BotError(BotErrorCode.NoTimeEntries);

    const { elapsed: totalElapsed, money: totalMoney } = getSummaryTotals(summary);
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
        {Object.entries(_.groupBy(summary, (value) => value.workspaceName)).map(([workspaceName, workspaceSummary]) => (
          <ReportDataSummaryField
            data={workspaceSummary}
            titleProvider={(elapsed, price) =>
              `${workspaceName} - $${round(price, 2).toFixed(2)} • ${formatElapsed(elapsed)}`
            }
          />
        ))}
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
