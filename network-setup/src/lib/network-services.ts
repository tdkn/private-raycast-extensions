import { execFileSync } from "child_process";
import { runAppleScript } from "@raycast/utils";

const NETWORKSETUP_PATH = "/usr/sbin/networksetup";

export type NetworkService = {
  name: string;
  enabled: boolean;
};

export type MoveDirection = -1 | 1;

/**
 * Parses `networksetup -listnetworkserviceorder` output into service entries.
 */
export function parseNetworkServices(raw: string): NetworkService[] {
  return raw.split("\n").flatMap((line) => {
    const match = line.match(/^\((\d+|\*)\)\s+(.+)$/);
    if (!match) {
      return [];
    }

    const [, index, rawName] = match;
    const name = rawName.startsWith("* ") ? rawName.slice(2) : rawName;

    return [{ name, enabled: index !== "*" }];
  });
}

/**
 * Reads the current network service order from `networksetup`.
 */
export function loadNetworkServices(): NetworkService[] {
  try {
    const raw = execFileSync(NETWORKSETUP_PATH, ["-listnetworkserviceorder"], {
      encoding: "utf8",
    });
    return parseNetworkServices(raw);
  } catch {
    return [];
  }
}

/**
 * Moves a service one step earlier or later in the current order.
 */
export function moveNetworkService(
  services: NetworkService[],
  index: number,
  direction: MoveDirection,
): NetworkService[] {
  return moveItem(services, index, direction);
}

/**
 * Extracts only the service names in display order.
 */
export function getNetworkServiceNames(services: NetworkService[]): string[] {
  return services.map(({ name }) => name);
}

/**
 * Applies the provided network service order using an administrator prompt.
 */
export async function applyNetworkServiceOrder(services: NetworkService[]): Promise<void> {
  await runAppleScript(buildApplyScript(services), {
    // The admin password prompt can stay open longer than the default timeout.
    timeout: 0,
  });
}

/**
 * Swaps an item with its adjacent neighbor if the requested move is valid.
 */
function moveItem<T>(items: T[], index: number, direction: MoveDirection): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
  return nextItems;
}

/**
 * Escapes a value so it can be passed as a single shell argument.
 */
function quoteForShell(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * Builds the AppleScript command that updates the service order with elevation.
 */
function buildApplyScript(services: NetworkService[]): string {
  const orderedServices = getNetworkServiceNames(services)
    .map((name) => quoteForShell(name))
    .join(" ");
  const command = `${NETWORKSETUP_PATH} -ordernetworkservices ${orderedServices}`;
  return `do shell script ${JSON.stringify(command)} with administrator privileges`;
}
