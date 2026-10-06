export const OPEN_STATUSES = new Set(["OPEN"]);

export function canChargeNow(status) {
  return OPEN_STATUSES.has(String(status || "").toUpperCase());
}

export function statusLabel(status) {
  switch (String(status || "").toUpperCase()) {
    case "OPEN":
      return "Deschisă acum";
    case "CONSTRUCTION":
      return "În construcție";
    case "PLAN":
      return "Planificată";
    case "VOTING":
      return "În votare";
    case "EXPANDING":
      return "Se extinde";
    default:
      return status || "Necunoscut";
  }
}

export function mapSite(raw) {
  const address = raw.address || {};
  const gps = raw.gps || {};
  return {
    id: raw.id,
    locationId: raw.locationId,
    name: raw.name,
    status: raw.status,
    city: raw.city || address.city,
    street: raw.street || address.street,
    state: raw.state || address.state,
    zip: raw.zip || address.zip,
    lat: raw.lat ?? gps.latitude,
    lng: raw.lng ?? gps.longitude,
    dateOpened: raw.dateOpened,
    stallCount: Number(raw.stallCount) || 0,
    powerKilowatt: raw.powerKilowatt,
    otherEVs: Boolean(raw.otherEVs),
    facilityName: raw.facilityName,
    stalls: raw.stalls,
    plugs: raw.plugs,
  };
}

export function formatAddress(site) {
  return [site.street, site.city].filter(Boolean).join(", ");
}

export function matchesQuery(site, query) {
  const needle = String(query || "")
    .trim()
    .toLowerCase();
  if (!needle) return true;
  return [site.name, site.city, site.street, site.facilityName]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(needle));
}

export function visibleSites(sites, filter, query) {
  return sites
    .filter((site) => {
      if (filter === "open") return canChargeNow(site.status);
      if (filter === "upcoming") return !canChargeNow(site.status);
      return true;
    })
    .filter((site) => matchesQuery(site, query))
    .sort((a, b) => {
      const openDelta = Number(canChargeNow(b.status)) - Number(canChargeNow(a.status));
      if (openDelta) return openDelta;
      return String(a.name).localeCompare(String(b.name), "ro");
    });
}

export function summarize(sites) {
  const open = sites.filter((site) => canChargeNow(site.status));
  return {
    openCount: open.length,
    openStalls: open.reduce((sum, site) => sum + (site.stallCount || 0), 0),
    upcomingCount: sites.length - open.length,
  };
}
