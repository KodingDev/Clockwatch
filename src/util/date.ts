export const formatElapsed = (milliseconds: number) => {
  let result = "";

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    result += `${days}d `;
  }

  if (hours > 0) {
    result += `${hours % 24}h `;
  }

  if (minutes > 0) {
    result += `${minutes % 60}m `;
  }

  if (seconds > 0) {
    result += `${seconds % 60}s `;
  }

  return result.trim();
};