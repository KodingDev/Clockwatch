import { useString } from "@zerite/slshx";
import {
  Project,
  timeRanges,
  User,
  UserInteractions,
  Workspace,
} from "@/clockify";

export const useWorkspace = (name: string, description: string) => {
  const tmp: string = useString(name, description, {
    required: true,
    autocomplete: async (interaction, env: Env) => {
      const user = interaction.member?.user ?? interaction.user;
      if (!user) return [];

      const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);

      try {
        const workspaces = await interactions.clockify.getWorkspaces();
        return workspaces
          .filter((value) =>
            value.name.toLowerCase().includes(tmp?.toLowerCase() ?? ""),
          )
          .map((value) => ({ name: value.name, value: value.id }));
      } catch (e) {
        return [];
      }
    },
  });
  return tmp;
};

export const useProject = (
  name: string,
  description: string,
  workspace?: string | null,
) => {
  const tmp: string = useString(name, description, {
    required: true,
    autocomplete: async (interaction, env: Env) => {
      const user = interaction.member?.user ?? interaction.user;
      if (!user) return [];

      const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);

      let projects: Project[] = [];
      let workspaces: Workspace[] = [];

      try {
        if (workspace) {
          projects = await interactions.clockify.getProjects(workspace);
        } else {
          workspaces = await interactions.clockify.getWorkspaces();
          for (const workspace of workspaces) {
            projects.push(
              ...(await interactions.clockify.getProjects(workspace.id)),
            );
          }
        }

        return projects
          .filter((value) =>
            value.name.toLowerCase().includes(tmp?.toLowerCase() ?? ""),
          )
          .map((value) => {
            if (workspace) {
              return {
                name: `${value.clientName} - ${value.name}`,
                value: value.id,
              };
            } else {
              const workspace = workspaces.find(
                (w) => w.id === value.workspaceId,
              )!;
              return {
                name: `${workspace.name} - ${value.name}`,
                value: value.id,
              };
            }
          });
      } catch (e) {
        return [];
      }
    },
  });
  return tmp;
};

export const useUserOptional = (
  name: string,
  description: string,
  workspace?: string | null,
) => {
  const tmp: string | null = useString(name, description, {
    autocomplete: async (interaction, env: Env) => {
      const user = interaction.member?.user ?? interaction.user;
      if (!user) return [];

      const interactions = new UserInteractions(env.CLOCKWATCH_KV, user);

      let users: User[] = [];
      let workspaces: Workspace[] = [];

      try {
        if (workspace) {
          users = await interactions.clockify.getUsers(workspace);
        } else {
          workspaces = await interactions.clockify.getWorkspaces();
          for (const workspace of workspaces) {
            users.push(...(await interactions.clockify.getUsers(workspace.id)));
          }
        }

        return users
          .filter((value) =>
            value.name.toLowerCase().includes(tmp?.toLowerCase() ?? ""),
          )
          .map((value) => {
            if (workspace) {
              return { name: value.name, value: value.id };
            } else {
              const workspace = workspaces.find((w) =>
                value.memberships.find(
                  (m) =>
                    m.targetId === w.id && m.membershipType === "WORKSPACE",
                ),
              )!;

              return {
                name: `${workspace.name} - ${value.name}`,
                value: value.id,
              };
            }
          });
      } catch (e) {
        return [];
      }
    },
  });
  return tmp;
};

export const useTimeRangeOptional = (name: string, description: string) => {
  const tmp: string | null = useString(name, description, {
    required: false,
    autocomplete: () =>
      timeRanges
        .filter((value) =>
          value.name.toLowerCase().includes(tmp?.toLowerCase() ?? ""),
        )
        .map((value) => ({ name: value.name, value: value.name })),
  });
  return timeRanges.find((value) => value.name === tmp) ?? timeRanges[0];
};
