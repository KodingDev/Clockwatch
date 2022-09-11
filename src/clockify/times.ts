export interface TimeRangeDefinition {
  name: string;
  sentenceName: string;
  get: () => TimeRange;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

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
      end.setDate(end.getDate() - 1);

      return { start, end };
    },
  },
  {
    name: "This Week",
    sentenceName: "this week",
    get: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay());

      const end = new Date();
      end.setHours(23, 59, 59, 999);
      end.setDate(end.getDate() + (6 - end.getDay()));

      return { start, end };
    },
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
