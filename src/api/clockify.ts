const uuidRegex = new RegExp(
  "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
  "i",
);

class ClockifyAPI {
  validateApiKey(apiKey: string): boolean {
    // Decode the key as base64
    let uuid;

    try {
      uuid = atob(apiKey);
    } catch (e) {
      return false;
    }

    // Check if the decoded key is a valid UUID
    return uuidRegex.test(uuid);
  }
}

const clockify = new ClockifyAPI();
export default clockify;
