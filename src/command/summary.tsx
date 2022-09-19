import { CommandHandler, createElement, Field, useDescription } from "@zerite/slshx";
import {
  BotError,
  BotErrorCode,
  useCurrencyOptional,
  useProject,
  useTimeRangeOptional,
  useUserOptional,
  useWorkspace,
} from "@/discord";
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
import { formatCurrency } from "@/api/currency";

function summaryProject(): CommandHandler<Env> {
  useDescription("Fetch clocked time summary for a specific project.");

  const workspaceId = useWorkspace("workspace", "The workspace to fetch.");
  const projectId = useProject("project", "The project to fetch.", workspaceId);
  const userId = useUserOptional("user", "The user to fetch.", workspaceId);
  const timeRange = useTimeRangeOptional("time", "The time range to fetch.");
  const currency = useCurrencyOptional("currency", "The currency to use.");

  return async function* (interaction, env) {
    yield;

    const interactions = new UserInteractions(env.CLOCKWATCH_KV, getInteractionUser(interaction));

    const workspace = await interactions.clockify.getWorkspaceById(workspaceId);
    const user = await interactions.getUserOrSelf(workspaceId, userId);
    const project = await interactions.clockify.getProjectById(workspaceId, projectId);
    const timeEntries = await interactions.clockify.getTimeEntriesFromRange(workspaceId, user.id, timeRange.get());

    const rate = project.hourlyRate ?? (await interactions.getHourlyRate(workspace, user));
    const summary = await getProjectSummary(timeEntries, project, rate, currency);
    if (!summary.length) throw new BotError(BotErrorCode.NoTimeEntries);

    const { elapsed: totalElapsed, money: totalMoney } = getSummaryTotals(summary);
    const estimatedTotal = estimateTotal(summary, timeRange);

    return (
      <SuccessMessage
        author={`Project Summary • ${project.name}`}
        footer={`Total: ${formatCurrency(currency, totalMoney)} • ${formatElapsed(totalElapsed)}`}
      >
        Showing time entries for {timeRange.sentenceName} for {user.name}.
        {estimatedTotal
          ? ` They are projected to earn ${formatCurrency(currency, estimatedTotal)} ${
              timeRange.sentenceName
            } on this project.`
          : ""}
        <ReportDataSummaryField
          data={summary}
          currency={currency}
          titleProvider={(elapsed, price) =>
            `Time Entries - ${formatCurrency(currency, price)} • ${formatElapsed(elapsed)}`
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
  const currency = useCurrencyOptional("currency", "The currency to use.");

  return async function* (interaction, env) {
    yield;

    const interactions = new UserInteractions(env.CLOCKWATCH_KV, getInteractionUser(interaction));

    const workspace = await interactions.clockify.getWorkspaceById(workspaceId);
    const user = await interactions.getUserOrSelf(workspaceId, userId);
    const projects = await interactions.clockify.getProjects(workspaceId);
    const timeEntries = await interactions.clockify.getTimeEntriesFromRange(workspaceId, user.id, timeRange.get());

    const rate = await interactions.getHourlyRate(workspace, user);
    const summary = await getWorkspaceSummary(timeEntries, projects, workspace, rate, currency);
    if (!summary.length) throw new BotError(BotErrorCode.NoTimeEntries);

    const projectSummary = _.groupBy(summary, (value) => value.projectName);
    const { elapsed: totalElapsed, money: totalMoney } = getSummaryTotals(summary);
    const estimatedTotal = estimateTotal(summary, timeRange);

    return (
      <SuccessMessage
        author={`Workspace Summary • ${workspace.name}`}
        footer={`Total: ${formatCurrency(currency, totalMoney)} • ${formatElapsed(totalElapsed)}`}
      >
        Showing time entries for {timeRange.sentenceName} for `{user.name}`.
        {estimatedTotal
          ? ` They are projected to earn ${formatCurrency(currency, estimatedTotal)} ${timeRange.sentenceName}.`
          : ""}
        {Object.entries(projectSummary).map(([projectName, projectSummary]) => (
          <ReportDataSummaryField
            data={projectSummary}
            currency={currency}
            titleProvider={(elapsed, price) =>
              `${projectName} - ${formatElapsed(elapsed)} • ${formatCurrency(currency, price)}`
            }
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
  const currency = useCurrencyOptional("currency", "The currency to use.");

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
          const summary = await getWorkspaceSummary(timeEntries, projects, workspace, rate, currency);
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
        footer={`Total: ${formatCurrency(currency, totalMoney)} • ${formatElapsed(totalElapsed)}`}
      >
        Showing time entries for {timeRange.sentenceName} across all workspace users.
        {estimatedTotal
          ? ` The projected total is ${formatCurrency(currency, estimatedTotal)} ${timeRange.sentenceName}.`
          : ""}
        {userSummary.map((userSummary) => (
          <ReportDataSummaryField
            data={userSummary}
            currency={currency}
            titleProvider={(elapsed, price) =>
              `${userSummary[0].userName ?? "User"} - ${formatCurrency(currency, price)} • ${formatElapsed(elapsed)}`
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
  const currency = useCurrencyOptional("currency", "The currency to use.");

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
        return _.chain(await getWorkspaceSummary(timeEntries, projects, workspace, rate, currency))
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

    const progress = timeRange.progress ? timeRange.progress(range) : 1;
    const percentWorked = Math.min(
      100,
      (totalElapsed / ((range.end.getTime() - range.start.getTime()) * progress)) * 100,
    );

    const stats = [
      ["Avg. Hours/Day", `${round(averageHoursPerDay, 2).toFixed(2)} hours`],
      ["Avg. Hourly Rate", `${formatCurrency(currency, averageHourlyRate)}/hr`],
      [`% Worked of ${timeRange.sentenceName}`, `${round(percentWorked, 2)}%`],
    ];

    if (estimatedTotal) {
      stats.push(["Projected Earnings", `${formatCurrency(currency, estimatedTotal)} ${timeRange.sentenceName}`]);
    }

    return (
      <SuccessMessage
        author={`Summary • ${user.name}`}
        footer={`Total: ${formatCurrency(currency, totalMoney)} • ${formatElapsed(totalElapsed)}`}
      >
        Showing time entries for {timeRange.sentenceName}.
        <Field name="Summary">{stats.map(([name, value]) => ` **•** \`${name}\`: ${value}`).join("\n")}</Field>
        {Object.entries(_.groupBy(summary, (value) => value.workspaceName)).map(([workspaceName, workspaceSummary]) => (
          <ReportDataSummaryField
            data={workspaceSummary}
            currency={currency}
            titleProvider={(elapsed, price) =>
              `${workspaceName} - ${formatCurrency(currency, price)} • ${formatElapsed(elapsed)}`
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
