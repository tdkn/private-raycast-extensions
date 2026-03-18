import { Action, ActionPanel, Color, Icon, List, showHUD } from "@raycast/api";
import { useState } from "react";
import {
  applyNetworkServiceOrder,
  getNetworkServiceNames,
  loadNetworkServices,
  moveNetworkService,
  type MoveDirection,
} from "./lib/network-services";

/**
 * Displays and applies the preferred network service order.
 *
 * @remarks In each {@link List.Item} ActionPanel, action order matters: Raycast assigns ↵ to the 1st
 * action and ⌘↵ to the 2nd. "Move to Top & Apply" is kept 1st so ↵ triggers it directly.
 */
export default function Command() {
  const [services, setServices] = useState(loadNetworkServices);
  const [appliedOrder, setAppliedOrder] = useState(() => getNetworkServiceNames(services));
  const [isApplying, setIsApplying] = useState(false);

  /**
   * Reorders the selected service in local state.
   */
  function moveService(index: number, direction: MoveDirection) {
    setServices((currentServices) => moveNetworkService(currentServices, index, direction));
  }

  /**
   * Moves the focused service to the top and immediately applies the order.
   */
  async function moveToTopAndApply(index: number) {
    const reordered = [services[index], ...services.filter((_, i) => i !== index)];
    setServices(reordered);
    setIsApplying(true);

    try {
      await applyNetworkServiceOrder(reordered);
      setAppliedOrder(getNetworkServiceNames(reordered));
      await showHUD("Service order applied");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await showHUD(`Failed to apply order: ${detail}`);
    } finally {
      setIsApplying(false);
    }
  }

  /**
   * Persists the current service order after prompting for administrator access.
   */
  async function applyOrder() {
    setIsApplying(true);

    try {
      await applyNetworkServiceOrder(services);
      setAppliedOrder(getNetworkServiceNames(services));
      await showHUD("Service order applied");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await showHUD(`Failed to apply order: ${detail}`);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <List isLoading={isApplying}>
      {services.length === 0 ? (
        <List.EmptyView title="No network services found" />
      ) : (
        services
          .filter((service) => service.enabled)
          .map((service, index) => (
            <List.Item
              key={service.name}
              title={service.name}
              icon={service.enabled ? Icon.Globe : Icon.XMarkCircle}
              accessories={[
                ...(appliedOrder[index] !== service.name ? [{ tag: { value: "moved", color: Color.Orange } }] : []),
                { text: `${index + 1}` },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Move to Top" icon={Icon.ArrowUpCircle} onAction={() => moveToTopAndApply(index)} />
                  <Action title="Apply Order" icon={Icon.CheckCircle} onAction={applyOrder} />
                  <Action
                    title="Move Down"
                    icon={Icon.ChevronDown}
                    shortcut={{ modifiers: ["shift"], key: "arrowDown" }}
                    onAction={() => moveService(index, 1)}
                  />
                  <Action
                    title="Move up"
                    icon={Icon.ChevronUp}
                    shortcut={{ modifiers: ["shift"], key: "arrowUp" }}
                    onAction={() => moveService(index, -1)}
                  />
                </ActionPanel>
              }
            />
          ))
      )}
    </List>
  );
}
