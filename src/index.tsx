import { createElement, createHandler, ErrorHandler } from "@zerite/slshx";
import { invite, settings, summary, user, workspace } from "@/command";
import { BotError } from "@/discord";
import { ErrorMessage } from "@/discord/components";
import Toucan from "toucan-js";

const errorHandler: ErrorHandler = (error) => {
  if (error instanceof BotError) {
    if (error.debug) {
      console.error(`[ERROR] ${error.message} | ${error.debug}`);
    }

    return <ErrorMessage>{error.message}</ErrorMessage>;
  }

  return undefined;
};

const handler = createHandler({
  // Replaced by esbuild when bundling, see scripts/build.js (do not edit)
  applicationId: SLSHX_APPLICATION_ID,
  applicationPublicKey: SLSHX_APPLICATION_PUBLIC_KEY,
  applicationSecret: SLSHX_APPLICATION_SECRET,
  testServerId: SLSHX_TEST_SERVER_ID,

  // Add your commands here
  commands: { settings, user, workspace, summary, invite },
  error: errorHandler,
});

// noinspection JSUnusedGlobalSymbols
export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
    const cloned = request.clone();

    try {
      return handler(request, env, ctx);
    } catch (error) {
      if (env.SENTRY_DSN) {
        const sentry = new Toucan({
          dsn: env.SENTRY_DSN,
          context: ctx,
          allowedHeaders: ["User-Agent"],
          allowedSearchParams: /(.*)/,
        });

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const json: any = await cloned.json();
          const user = json.member?.user ?? json.user;

          const userName = `${user.username}#${user.discriminator}`;
          const userId = user.id;

          sentry.setUser({
            id: userId,
            username: userName,
          });

          sentry.setRequestBody(json);
        } catch (error) {
          console.error(error);
        }

        sentry.captureException(error);
      }

      console.error(error);
      return new Response("Internal Server Error", {
        status: 500,
        statusText: "Internal Server Error",
      });
    }
  },
};
