import { useString } from "@zerite/slshx";
import { getInteractionUser } from "@/util";
import { CURRENCIES, Currency } from "@/api/client";
import { Project, User, Workspace } from "@/api/generic";
import { TIME_RANGES, UserInteractions } from "@/api";

/**
 * Wrapper for the useString hook to retrieve a workspace for the user, and
 * provide autocomplete options for the workspace name.
 *
 * @param name The parameter name
 * @param description The parameter description
 */
export const useWorkspace = (name: string, description: string) => {
  const tmp: string = useString(name, description, {
    required: true,
    autocomplete: async (interaction, env: Env) => {
      const user = getInteractionUser(interaction);
      const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);

      try {
        const workspaces = await interactions.clockify.getWorkspaces();
        return workspaces
          .filter((value) => value.name.toLowerCase().includes(tmp?.toLowerCase() ?? ""))
          .map((value) => ({ name: value.name, value: value.id }));
      } catch (e) {
        return [];
      }
    },
  });
  return tmp;
};

/**
 * Wrapper for the useString hook to retrieve a project for the user, and
 * provide autocomplete options for the project name.
 *
 * @param name The parameter name
 * @param description The parameter description
 * @param workspace An optional workspace to filter projects by
 */
export const useProject = (name: string, description: string, workspace?: string | null) => {
  const tmp: string = useString(name, description, {
    required: true,
    autocomplete: async (interaction, env: Env) => {
      const user = getInteractionUser(interaction);
      const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);

      let projects: Project[] = [];
      let workspaces: Workspace[] = [];

      try {
        // If we have a workspace, get the projects for that workspace
        if (workspace) {
          projects = await interactions.clockify.getProjects(workspace);
        } else {
          // Otherwise add all projects from all workspaces
          workspaces = await interactions.clockify.getWorkspaces();
          for (const workspace of workspaces) {
            projects.push(...(await interactions.clockify.getProjects(workspace.id)));
          }
        }

        return (
          projects
            // Filter projects by the current value of the parameter
            .filter((value) => value.name.toLowerCase().includes(tmp?.toLowerCase() ?? ""))
            .map((value) => {
              if (workspace) {
                // If we have a workspace, return to the format of "Client - Project"
                return {
                  name: `${value.client?.name ?? "Unknown"} - ${value.name}`,
                  value: value.id,
                };
              } else {
                // Otherwise return to the format of "Workspace - Project"
                const workspace = workspaces.find((w) => w.id === value.workspace?.id)!;
                return {
                  name: `${workspace.name} - ${value.name}`,
                  value: value.id,
                };
              }
            })
        );
      } catch (e) {
        return [];
      }
    },
  });
  return tmp;
};

/**
 * Wrapper for the useString hook to retrieve a user for the user, and
 * provide autocomplete options for the username.
 *
 * @param name The parameter name
 * @param description The parameter description
 * @param workspace An optional workspace to filter users by
 */
export const useUserOptional = (name: string, description: string, workspace?: string | null) => {
  const tmp: string | null = useString(name, description, {
    autocomplete: async (interaction, env: Env) => {
      const user = getInteractionUser(interaction);
      const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);

      let users: User[] = [];
      let workspaces: Workspace[] = [];

      try {
        if (workspace) {
          // If we have a workspace, get the users for that workspace
          users = await interactions.clockify.getUsers(workspace);
        } else {
          // Otherwise add all users from all workspaces
          workspaces = await interactions.clockify.getWorkspaces();
          for (const workspace of workspaces) {
            users.push(...(await interactions.clockify.getUsers(workspace.id)));
          }
        }

        return (
          users
            // Filter users by the current value of the parameter
            .filter((value) => value.name.toLowerCase().includes(tmp?.toLowerCase() ?? ""))
            .map((value) => {
              if (workspace) {
                // If we have a workspace, return to the format of "User"
                return { name: value.name, value: value.id };
              } else {
                // Otherwise return to the format of "Workspace - User"
                const workspace = workspaces.find((w) => value.workspaces?.find((m) => m.id === w.id));
                if (!workspace) return undefined;

                return {
                  name: `${workspace.name} - ${value.name}`,
                  value: value.id,
                };
              }
            })
            .filter((value) => value !== undefined)
            .map((value) => value!)
        );
      } catch (e) {
        return [];
      }
    },
  });
  return tmp;
};

/**
 * Wrapper for the useString hook to retrieve a time range.
 *
 * @param name The parameter name
 * @param description The parameter description
 */
export const useTimeRangeOptional = (name: string, description: string) => {
  const tmp: string | null = useString(name, description, {
    required: false,
    autocomplete: () =>
      TIME_RANGES.filter((value) => value.name.toLowerCase().includes(tmp?.toLowerCase() ?? "")).map((value) => ({
        name: value.name,
        value: value.name,
      })),
  });
  return TIME_RANGES.find((value) => value.name === tmp) ?? TIME_RANGES[0];
};

const defaultCurrencies: Currency[] = [
  Currency.USD,
  Currency.AUD,
  Currency.CAD,
  Currency.EUR,
  Currency.NZD,
  Currency.GBP,
  Currency.JPY,
  Currency.CNY,
];

/**
 * Wrapper for the useString hook to retrieve a currency.
 *
 * @param name The parameter name
 * @param description The parameter description
 */
export const useCurrencyOptional = (name: string, description: string) => {
  const tmp: string | null = useString(name, description, {
    required: false,
    autocomplete: () => {
      const currencies = tmp
        ? CURRENCIES.filter((value) => value.toLowerCase().includes(tmp?.toLowerCase() ?? ""))
        : defaultCurrencies;

      return currencies
        .map((value) => ({
          name: value,
          value: value,
        }))
        .slice(0, 25);
    },
  });
  return CURRENCIES.find((value) => value === tmp) ?? Currency.USD;
};
