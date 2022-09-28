import { formatElapsed } from "@/util";
import _ from "lodash";
import { createElement, Field } from "@zerite/slshx";
import { Currency, formatCurrency } from "@/api/client";
import { TimeEntry } from "@/api/generic";

export const ReportDataDetails = (props: { data: TimeEntry; currency: Currency }) => {
  const { data, currency } = props;

  const elapsed = formatElapsed(data.durationMS);
  const price = formatCurrency(currency, data.total ?? 0);

  const prefix = data.project?.client ? `${data.project.client.name}: ` : "";
  const description = data.description ?? "Other";

  return ` **•** \`${prefix}${data.project?.name ?? "Unknown"}\` ${description} (${elapsed}): ${price}`;
};

interface ReportDataSummaryFieldProps {
  data: TimeEntry[];
  currency: Currency;
  titleProvider: (elapsed: number, price: number) => string;
  headerSize?: number;
}

export const ReportDataSummaryField = (props: ReportDataSummaryFieldProps) => {
  const { data, currency, headerSize = 3 } = props;

  const sorted = _.sortBy(data, (value) => -value.durationMS);

  const headerData = sorted.slice(0, headerSize);
  const headerTotal = _.sumBy(headerData, (value) => value.total ?? 0);
  const headerDuration = _.sumBy(headerData, (value) => value.durationMS);

  const footerData = sorted.slice(headerSize);
  const footerTotal = _.sumBy(footerData, (value) => value.total ?? 0);
  const footerDuration = _.sumBy(footerData, (value) => value.durationMS);

  const title = props.titleProvider(headerDuration + footerDuration, headerTotal + footerTotal);
  const footer = `*... and ${footerData.length} more projects for ${formatCurrency(
    currency,
    footerTotal,
  )} (${formatElapsed(footerDuration)})...*`;

  return (
    <Field name={title}>
      {headerData.map((value) => <ReportDataDetails currency={currency} data={value} />).join("\n")}
      {footerData.length ? `\n${footer}` : ""}
    </Field>
  );
};
