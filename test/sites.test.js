import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canChargeNow, summarize, visibleSites, mapSite } from "../lib/sites.js";

const sites = JSON.parse(
  readFileSync(new URL("../data/romania-superchargers.json", import.meta.url), "utf8")
).map(mapSite);

test("only OPEN Superchargers count as charging now", () => {
  assert.equal(canChargeNow("OPEN"), true);
  assert.equal(canChargeNow("PLAN"), false);
  assert.equal(canChargeNow("CONSTRUCTION"), false);
});

test("default view lists currently open Tesla Superchargers in Romania", () => {
  const open = visibleSites(sites, "open", "");
  assert.ok(open.length >= 16, `expected at least 16 open sites, got ${open.length}`);
  assert.ok(open.every((site) => site.status === "OPEN"));
  assert.ok(open.some((site) => /Drobeta/i.test(site.name)));
  assert.ok(open.some((site) => /Brașov|Brasov/i.test(site.name)));
});

test("planned sites are hidden from the now-charging view", () => {
  const open = visibleSites(sites, "open", "");
  assert.equal(open.some((site) => site.status === "PLAN"), false);
  const upcoming = visibleSites(sites, "upcoming", "Constanta");
  assert.ok(upcoming.length >= 1);
});

test("summary counts open stalls, not planned zeros", () => {
  const summary = summarize(sites);
  assert.equal(summary.openCount, sites.filter((s) => s.status === "OPEN").length);
  assert.ok(summary.openStalls > 0);
  assert.ok(summary.upcomingCount > 0);
});
