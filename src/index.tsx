import { createHandler } from "slshx";
import { settings } from "./command/settings";
import { user } from "./command/user";
import { workspace } from "./command/workspace";
import { summary } from "./command/summary";

const handler = createHandler({
  // Replaced by esbuild when bundling, see scripts/build.js (do not edit)
  applicationId: SLSHX_APPLICATION_ID,
  applicationPublicKey: SLSHX_APPLICATION_PUBLIC_KEY,
  applicationSecret: SLSHX_APPLICATION_SECRET,
  testServerId: SLSHX_TEST_SERVER_ID,

  // Add your commands here
  commands: { settings, user, workspace, summary },
});

export default { fetch: handler };
