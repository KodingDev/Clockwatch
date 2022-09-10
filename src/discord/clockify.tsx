import { ClockifyError } from "../api/clockify";
import { ErrorMessage } from "./messages";
import { createElement } from "slshx";

const errors: Record<number, string> = {
  401: "Your Clockify API key is not set or invalid. Please set it with `/settings setapikey <key>`",
  403: "You do not have permission to access this resource.",
};

export async function wrapClockifyBlock<T>(block: () => T): Promise<T> {
  try {
    const resp = await block();
    if (resp == null) {
      return (
        <ErrorMessage>
          No response was provided. Please report this.
        </ErrorMessage>
      );
    }

    return resp;
  } catch (e) {
    if (e instanceof ClockifyError) {
      return (
        <ErrorMessage>
          {errors[e.status] ||
            `An error occurred (code ${e.status} - ${e.message}). Please try again later.`}
        </ErrorMessage>
      );
    } else {
      throw e;
    }
  }
}
