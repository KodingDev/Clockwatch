import { ReportData } from "@/clockify";
import { formatElapsed } from "@/util";
import _, { round } from "lodash";
import { createElement, Field } from "@zerite/slshx";

export const ReportDataDetails = (props: { data: ReportData }) => {
  const { data } = props;

  const elapsed = formatElapsed(data.durationMS);
  const price = round(data.price, 2).toFixed(2);

  const prefix = data.clientName.length ? `${data.clientName}: ` : "";
  const description = data.description ?? "Other";

  return ` **•** \`${prefix}${data.projectName}\` ${description} (${elapsed}): $${price}`;
};

interface ReportDataSummaryFieldProps {
  data: ReportData[];
  titleProvider: (elapsed: number, price: number) => string;
  headerSize?: number;
}

export const ReportDataSummaryField = (props: ReportDataSummaryFieldProps) => {
  const { data, headerSize = 3 } = props;

  const sorted = _.sortBy(data, (value) => -value.durationMS);

  const headerData = sorted.slice(0, headerSize);
  const headerTotal = _.sumBy(headerData, (value) => value.price);
  const headerDuration = _.sumBy(headerData, (value) => value.durationMS);

  const footerData = sorted.slice(headerSize);
  const footerTotal = _.sumBy(footerData, (value) => value.price);
  const footerDuration = _.sumBy(footerData, (value) => value.durationMS);

  const title = props.titleProvider(headerDuration + footerDuration, headerTotal + footerTotal);
  const footer = `*... and ${footerData.length} more projects for $${round(footerTotal, 2).toFixed(2)} (${formatElapsed(
    footerDuration,
  )})...*`;

  return (
    <Field name={title}>
      {headerData.map((value) => <ReportDataDetails data={value} />).join("\n")}
      {footerData.length ? `\n${footer}` : ""}
    </Field>
  );
};
