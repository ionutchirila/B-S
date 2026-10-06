import {
  canChargeNow,
  formatAddress,
  mapSite,
  matchesQuery,
  statusLabel,
  summarize,
  visibleSites,
} from "./lib/sites.js";

const SITES_URL = "https://supercharge.info/service/supercharge/allSites";
const DB_URL = "https://supercharge.info/service/supercharge/databaseInfo";
const FALLBACK_URL = "./data/romania-superchargers.json";

const state = {
  sites: [],
  filter: "open",
  query: "",
  selectedId: null,
  markers: new Map(),
};

const els = {
  list: document.getElementById("site-list"),
  search: document.getElementById("search"),
  updated: document.getElementById("updated"),
  open: document.getElementById("stat-open"),
  stalls: document.getElementById("stat-stalls"),
  upcoming: document.getElementById("stat-upcoming"),
};

const map = L.map("map", { zoomControl: true }).setView([45.94, 24.97], 7);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap",
  maxZoom: 19,
}).addTo(map);

const layer = L.layerGroup().addTo(map);

function statusClass(status) {
  const value = (status || "").toLowerCase();
  if (value === "open") return "open";
  if (value === "construction") return "construction";
  return "plan";
}

function markerColor(status) {
  if (canChargeNow(status)) return "#3dd68c";
  if ((status || "").toUpperCase() === "CONSTRUCTION") return "#f5a524";
  return "#6ea8fe";
}

function popupHtml(site) {
  const charge = canChargeNow(site.status)
    ? "Poți încărca aici acum"
    : "Nu este deschisă pentru încărcare acum";
  return `
    <strong>${site.name}</strong><br/>
    ${formatAddress(site)}<br/>
    ${site.stallCount || 0} locuri · ${site.powerKilowatt || "?"} kW
    ${site.otherEVs ? " · și alte EV-uri" : ""}<br/>
    <em>${charge}</em>
  `;
}

function renderStats(sites) {
  const summary = summarize(sites);
  els.open.textContent = String(summary.openCount);
  els.stalls.textContent = String(summary.openStalls);
  els.upcoming.textContent = String(summary.upcomingCount);
}

function renderList(sites) {
  const rows = visibleSites(sites, state.filter, state.query);
  if (!rows.length) {
    els.list.innerHTML =
      '<li class="empty">Nicio stație Tesla nu corespunde filtrului. Alege „Disponibile acum” ca să vezi Superchargerele deschise.</li>';
    return;
  }

  els.list.innerHTML = rows
    .map((site) => {
      const selected = site.id === state.selectedId ? " selected" : "";
      return `
        <li>
          <button class="site${selected}" type="button" data-id="${site.id}">
            <span class="badge ${statusClass(site.status)}">${statusLabel(site.status)}</span>
            <p class="site-name">${site.name}</p>
            <p class="site-meta">${formatAddress(site)} · ${site.stallCount || 0} locuri · ${
              site.powerKilowatt || "?"
            } kW</p>
          </button>
        </li>`;
    })
    .join("");
}

function renderMarkers(sites) {
  layer.clearLayers();
  state.markers.clear();
  const rows = visibleSites(sites, state.filter, state.query);
  const bounds = [];

  for (const site of rows) {
    if (site.lat == null || site.lng == null) continue;
    const marker = L.circleMarker([site.lat, site.lng], {
      radius: canChargeNow(site.status) ? 9 : 7,
      color: markerColor(site.status),
      fillColor: markerColor(site.status),
      fillOpacity: 0.9,
      weight: 2,
    }).bindPopup(popupHtml(site));
    marker.on("click", () => selectSite(site.id, false));
    marker.addTo(layer);
    state.markers.set(site.id, marker);
    bounds.push([site.lat, site.lng]);
  }

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 8 });
  }
}

function selectSite(id, pan = true) {
  state.selectedId = id;
  renderList(state.sites);
  const site = state.sites.find((item) => item.id === id);
  const marker = state.markers.get(id);
  if (marker) marker.openPopup();
  if (pan && site?.lat != null) {
    map.setView([site.lat, site.lng], 12, { animate: true });
  }
}

function render() {
  renderStats(state.sites);
  renderList(state.sites);
  renderMarkers(state.sites);
}

async function loadLiveSites() {
  const response = await fetch(SITES_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  return payload
    .filter((site) => site?.address?.country === "Romania")
    .map(mapSite);
}

async function loadFallbackSites() {
  const response = await fetch(FALLBACK_URL);
  if (!response.ok) throw new Error(`fallback HTTP ${response.status}`);
  const payload = await response.json();
  return payload.map(mapSite);
}

async function loadUpdatedLabel(fromLive) {
  if (!fromLive) {
    els.updated.textContent =
      "Date din copia locală — rețeaua live nu a răspuns.";
    return;
  }
  try {
    const response = await fetch(DB_URL);
    const info = await response.json();
    const stamp = info.lastModified
      ? new Date(info.lastModified).toLocaleString("ro-RO")
      : info.lastModifiedString;
    els.updated.textContent = `Actualizat ${stamp} · sursă supercharge.info`;
  } catch {
    els.updated.textContent = "Date live Supercharger · România";
  }
}

els.list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  selectSite(Number(button.dataset.id));
});

els.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

document.querySelector(".chips").addEventListener("click", (event) => {
  const chip = event.target.closest("[data-filter]");
  if (!chip) return;
  state.filter = chip.dataset.filter;
  document.querySelectorAll(".chip").forEach((node) => {
    node.classList.toggle("active", node === chip);
  });
  render();
});

async function init() {
  try {
    state.sites = await loadLiveSites();
    await loadUpdatedLabel(true);
  } catch (error) {
    console.warn("Live Tesla data failed, using fallback", error);
    state.sites = await loadFallbackSites();
    await loadUpdatedLabel(false);
  }
  render();
}

init();
