import _ from "lodash";
import {
  PayRate,
  Project,
  ReportData,
  TimeEntry,
  TimeInterval,
  Workspace,
} from "./types";

const getDuration = (timeInterval: TimeInterval): number => {
  const start = new Date(timeInterval.start);
  const end = timeInterval.end ? new Date(timeInterval.end) : new Date();
  return end.getTime() - start.getTime();
};

export const getProjectSummary = (
  timeEntries: TimeEntry[],
  project: Project,
  rate: PayRate,
): ReportData[] => {
  const projectEntries = timeEntries.filter((t) => t.projectId === project.id);
  return _.chain(projectEntries)
    .groupBy((t) => t.description)
    .map((entries, description) => {
      const durationMS = entries.reduce(
        (total, t) => total + getDuration(t.timeInterval),
        0,
      );

      // Returns a whole number by default, divide by 100 to get a decimal
      const hourlyRate = (project.hourlyRate.amount || rate.amount) / 100;
      return <ReportData>{
        projectName: project.name,
        clientName: project.clientName ?? "",
        description,
        price: durationMS * (hourlyRate / 3600000),
        durationMS,
      };
    })
    .value();
};

export const getWorkspaceSummary = (
  timeEntries: TimeEntry[],
  projects: Project[],
  workspace: Workspace,
  rate: PayRate,
): ReportData[] => {
  const projectIds = projects.map((p) => p.id);
  const workspaceEntries = timeEntries.filter((t) =>
    projectIds.includes(t.projectId),
  );

  return _.chain(workspaceEntries)
    .groupBy((t) => t.projectId)
    .map((entries, projectId) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      const projectSummary = getProjectSummary(
        entries,
        project,
        rate.amount === 0 ? project.hourlyRate : rate,
      );

      return projectSummary.map((s) => ({
        ...s,
        workspaceName: workspace.name,
      }));
    })
    .flatten()
    .value();
};
