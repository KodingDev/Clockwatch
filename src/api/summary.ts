import { PayRate, Project, TimeEntry, TimeInterval } from "./types/clockify";
import { ReportData } from "./types/summary";
import _ from "lodash";

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
