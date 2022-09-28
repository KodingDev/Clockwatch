import _ from "lodash";
import { TimeRangeDefinition } from "@/api";
import { Currency, currencyAPI } from "@/api/client";
import { CurrencyPair, Project, TimeEntry, Workspace } from "@/api/generic";

/**
 * Gets a summary of the time entries for a given project.
 *
 * @param timeEntries The time entries.
 * @param project The project.
 * @param rate The rate to use for the project.
 * @param currency The currency to use for the project.
 * @returns A list of time entries grouped by their description and summarized.
 */
export const getProjectSummary = async (
  timeEntries: TimeEntry[],
  project: Project,
  rate: CurrencyPair,
  currency: Currency,
): Promise<TimeEntry[]> => {
  // Find relevant project entries
  const projectEntries = timeEntries.filter((t) => t.project?.id === project.id);
  return Promise.all(
    _.chain(projectEntries)
      .groupBy((t) => t.description)
      .map(async (entries) => {
        // Calculate total duration
        const durationMS = entries.reduce((total, t) => total + t.durationMS, 0);
        const convertedRate = await currencyAPI.convert(project.hourlyRate || rate, currency);

        return <TimeEntry>{
          ...entries[0],
          project,
          total: durationMS * (convertedRate.amount / 3600000),
          durationMS,
        };
      })
      .value(),
  );
};

/**
 * Gets a summary of the time entries for a given workspace.
 *
 * @param timeEntries The time entries.
 * @param projects The projects.
 * @param workspace The workspace.
 * @param rate The rate to use for the workspace.
 * @param currency The currency to use for reporting.
 * @returns A list of time entries grouped by their description and summarized.
 */
export const getWorkspaceSummary = async (
  timeEntries: TimeEntry[],
  projects: Project[],
  workspace: Workspace,
  rate: CurrencyPair,
  currency: Currency,
): Promise<TimeEntry[]> => {
  // Find relevant workspace entries
  const projectIds = projects.map((p) => p.id);
  const workspaceEntries = timeEntries.filter((t) => t.project && projectIds.includes(t.project?.id));

  const workspaceRate = workspace.hourlyRate || rate;
  const convertedRate = await currencyAPI.convert(workspaceRate, currency);

  const projectEntries = _.flatten(
    await Promise.all(
      _.chain(workspaceEntries)
        .groupBy((t) => t.project?.id)
        .map(async (entries, projectId) => {
          // Get project
          const project = projects.find((p) => p.id === projectId);
          if (!project) throw new Error("Project not found");

          // Create a summary for the project
          const projectSummary = await getProjectSummary(entries, project, convertedRate, currency);

          // Map the project summary and add the workspace name
          return projectSummary.map(
            (s) =>
              <TimeEntry>{
                ...s,
                workspace,
              },
          );
        })
        .value(),
    ),
  );

  const nonProjectEntries = timeEntries.filter((t) => !t.project || !t.project.id);
  if (nonProjectEntries.length) {
    // Create a summary for the non-project entries
    const nonProjectSummary = _.chain(nonProjectEntries)
      .groupBy((t) => t.description)
      .map((entries, description) => {
        // Calculate total duration
        const durationMS = entries.reduce((total, t) => total + t.durationMS, 0);

        return <TimeEntry>{
          ...entries[0],
          description: description.length ? description : undefined,
          total: durationMS * (convertedRate.amount / 3600000),
          durationMS,
        };
      })
      .value();

    // Add the non-project summary to the project entries
    projectEntries.push(...nonProjectSummary);
  }

  return projectEntries;
};

export const estimateTotal = (summary: TimeEntry[], range: TimeRangeDefinition): number | undefined => {
  // Get the time range and progress
  const timeRange = range.get();
  const progress = range.progress ? range.progress(timeRange) : 1;
  if (progress === 1) return undefined;

  // Calculate the estimated total
  const total = summary.reduce((total, s) => total + (s.total ?? 0), 0);
  return total / progress;
};

export const getSummaryTotals = (summary: TimeEntry[]): { money: number; elapsed: number } =>
  summary.reduce(
    (totals, s) => {
      totals.money += s.total ?? 0;
      totals.elapsed += s.durationMS;
      return totals;
    },
    { money: 0, elapsed: 0 },
  );
