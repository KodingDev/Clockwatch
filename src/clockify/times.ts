export interface TimeRangeDefinition {
  /**
   * The name of the time range.
   */
  name: string;

  /**
   * A sentence applicable name for the time range.
   */
  sentenceName: string;

  /**
   * Get the current time range.
   */
  get: () => TimeRange;

  /**
   * Get the progress of the current time range.
   * @param range The time range.
   * @returns A number between 0 and 1 describing how far into the time range we are.
   */
  progress?: (range: TimeRange) => number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

const defaultProgressFunction = (range: TimeRange): number => {
  const now = new Date();
  const start = range.start;
  const end = range.end;
  const total = end.getTime() - start.getTime();
  const current = now.getTime() - start.getTime();
  return Math.min(1, current / total);
};

export const timeRanges: TimeRangeDefinition[] = [
  {
    name: "This Month",
    sentenceName: "this month",
    get: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(1);

      const end = new Date();
      end.setHours(23, 59, 59, 999);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);

      return { start, end };
    },
    progress: defaultProgressFunction,
  },
  {
    name: "This Week",
    sentenceName: "this week",
    get: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1));

      const end = new Date();
      end.setHours(23, 59, 59, 999);
      end.setDate(start.getDate() + 6);

      console.log(start, end);
      return { start, end };
    },
    progress: defaultProgressFunction,
  },
  {
    name: "This Year",
    sentenceName: "this year",
    get: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setMonth(0);
      start.setDate(1);

      const end = new Date();
      end.setHours(23, 59, 59, 999);
      end.setMonth(11);
      end.setDate(31);

      return { start, end };
    },
    progress: defaultProgressFunction,
  },
  {
    name: "Today",
    sentenceName: "today",
    get: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      return { start, end };
    },
  },
  {
    name: "Yesterday",
    sentenceName: "yesterday",
    get: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 1);

      const end = new Date();
      end.setHours(23, 59, 59, 999);
      end.setDate(start.getDate());
      return { start, end };
    },
  },
  {
    name: "Last 7 Days",
    sentenceName: "the last 7 days",
    get: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 7);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      return { start, end };
    },
  },
  {
    name: "Last 30 Days",
    sentenceName: "the last 30 days",
    get: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 30);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      return { start, end };
    },
  },
];
