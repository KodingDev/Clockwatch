import _ from "lodash";
import { PayRate, Project, ReportData, TimeEntry, TimeInterval, Workspace } from "./types";
import { TimeRangeDefinition } from "@/clockify/times";

/**
 * Gets the duration of a time interval in milliseconds.
 * @param timeInterval The time interval.
 */
const getDuration = (timeInterval: TimeInterval): number => {
  const start = new Date(timeInterval.start);
  const end = timeInterval.end ? new Date(timeInterval.end) : new Date();
  return end.getTime() - start.getTime();
};

/**
 * Gets a summary of the time entries for a given project.
 *
 * @param timeEntries The time entries.
 * @param project The project.
 * @param rate The rate to use for the project.
 * @returns A list of ReportData objects, grouped by description.
 */
export const getProjectSummary = (timeEntries: TimeEntry[], project: Project, rate: PayRate): ReportData[] => {
  // Find relevant project entries
  const projectEntries = timeEntries.filter((t) => t.projectId === project.id);
  return _.chain(projectEntries)
    .groupBy((t) => t.description)
    .map((entries, description) => {
      // Calculate total duration
      const durationMS = entries.reduce((total, t) => total + getDuration(t.timeInterval), 0);

      // Returns a whole number by default, divide by 100 to get a decimal
      const hourlyRate = (project.hourlyRate?.amount || rate.amount) / 100;
      return <ReportData>{
        projectName: project.name,
        clientName: project.clientName ?? "",
        description: description.length ? description : undefined,
        price: durationMS * (hourlyRate / 3600000),
        durationMS,
      };
    })
    .value();
};

/**
 * Gets a summary of the time entries for a given workspace.
 *
 * @param timeEntries The time entries.
 * @param projects The projects.
 * @param workspace The workspace.
 * @param rate The rate to use for the workspace.
 * @returns A list of ReportData objects, grouped by description.
 */
export const getWorkspaceSummary = (
  timeEntries: TimeEntry[],
  projects: Project[],
  workspace: Workspace,
  rate: PayRate,
): ReportData[] => {
  // Find relevant workspace entries
  const projectIds = projects.map((p) => p.id);
  const workspaceEntries = timeEntries.filter((t) => projectIds.includes(t.projectId));

  const projectEntries = _.chain(workspaceEntries)
    .groupBy((t) => t.projectId)
    .map((entries, projectId) => {
      // Get project
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      // Create a summary for the project
      const projectSummary = getProjectSummary(
        entries,
        project,
        project.hourlyRate?.amount === 0 ? rate : project.hourlyRate ?? rate,
      );

      // Map the project summary and add the workspace name
      return projectSummary.map((s) => ({
        ...s,
        workspaceName: workspace.name,
      }));
    })
    .flatten()
    .value();

  const nonProjectEntries = timeEntries.filter((t) => !t.projectId);
  if (nonProjectEntries.length) {
    // Create a summary for the non-project entries
    const nonProjectSummary = _.chain(nonProjectEntries)
      .groupBy((t) => t.description)
      .map((entries, description) => {
        // Calculate total duration
        const durationMS = entries.reduce((total, t) => total + getDuration(t.timeInterval), 0);

        // Returns a whole number by default, divide by 100 to get a decimal
        const hourlyRate = rate.amount / 100;
        return <ReportData>{
          projectName: "No Project",
          workspaceName: workspace.name,
          clientName: "",
          description: description.length ? description : undefined,
          price: durationMS * (hourlyRate / 3600000),
          durationMS,
        };
      })
      .value();

    // Add the non-project summary to the project entries
    projectEntries.push(...nonProjectSummary);
  }

  return projectEntries;
};

export const estimateTotal = (summary: ReportData[], range: TimeRangeDefinition): number | undefined => {
  // Get the time range and progress
  const timeRange = range.get();
  const progress = range.progress ? range.progress(timeRange) : 1;
  if (progress === 1) return undefined;

  // Calculate the estimated total
  const total = summary.reduce((total, s) => total + s.price, 0);
  return total / progress;
};
