import type { StarlightRouteData } from "@astrojs/starlight/route-data";

type SidebarEntry = StarlightRouteData["sidebar"][number];

/**
 * The labels of the sidebar groups that hold the current page, outermost first: for
 * `/guides/multi-tenancy/` that is `["Guides", "Tenancy"]`. Empty for a page the sidebar doesn't
 * list, such as the home page or the 404 page.
 */
export function sidebarTrail(sidebar: StarlightRouteData["sidebar"]): string[] {
  const find = (entries: SidebarEntry[], trail: string[]): string[] | undefined => {
    for (const entry of entries) {
      if (entry.type === "link") {
        if (entry.isCurrent) return trail;
      } else {
        const found = find(entry.entries, [...trail, entry.label]);
        if (found) return found;
      }
    }
    return undefined;
  };
  return find(sidebar, []) ?? [];
}
