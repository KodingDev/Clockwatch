import { createElement, createHandler, ErrorHandler } from "@zerite/slshx";
import { invite, settings, summary, user, workspace } from "@/command";
import { BotError, ErrorMessage } from "@/discord";

const errorHandler: ErrorHandler = (error) => {
  if (error instanceof BotError) {
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
export default { fetch: handler };
