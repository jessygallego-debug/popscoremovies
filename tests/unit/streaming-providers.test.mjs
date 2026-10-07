import assert from "node:assert/strict";
import { test } from "node:test";
import { groupStreamingProviders } from "../../lib/streaming-providers.ts";

test("groups delivery channels and preserves all provider IDs", () => {
  const groups = groupStreamingProviders([
    { provider_id: 2, provider_name: "Paramount+ Amazon Channel" },
    { provider_id: 1, provider_name: "Paramount+" },
    { provider_id: 3, provider_name: "Paramount+ Apple TV Channel" },
    { provider_id: 4, provider_name: "Starz Amazon Channel" },
    { provider_id: 5, provider_name: "Starz Apple TV Channel" },
    { provider_id: 6, provider_name: "Apple TV+" },
    { provider_id: 7, provider_name: "Apple TV" },
    { provider_id: 8, provider_name: "Amazon Prime Video" },
  ]);
  assert.deepEqual(groups.map(group => group.provider_name), ["Apple TV", "Paramount+", "Prime Video", "Starz"]);
  assert.equal(groups[1].provider_id, 1);
  assert.deepEqual(groups[1].provider_ids, [2, 1, 3]);
  assert.deepEqual(groups[3].provider_ids, [4, 5]);
  assert.deepEqual(groupStreamingProviders(groups), groups);
});

test("does not merge separate services or invent unavailable country IDs", () => {
  const groups = groupStreamingProviders([
    { provider_id: 1, provider_name: "Paramount+ Amazon Channel" },
    { provider_id: 2, provider_name: "Paramount+ with Showtime" },
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].provider_ids, [1]);
});


test("groups spelling, plan and channel variants without losing IDs", () => {
  const names = ["Acorn TV", "AcornTV Amazon Channel", "A&E", "A&E Crime Central", "AMC", "AMC Plus", "AMC+ Amazon Channel", "Amazon Video", "Amazon Prime Video", "Apple TV", "Apple TV Store", "Discovery +", "Discovery+ Amazon Channel", "ALLBLK", "ALLBLK Amazon channel with ads", "The Roku Channel"];
  const groups = groupStreamingProviders(names.map((provider_name, index) => ({ provider_id: index + 1, provider_name })));
  assert.deepEqual(groups.map(group => group.provider_name), ["A&E", "Acorn TV", "ALLBLK", "AMC", "Apple TV", "Discovery+", "Prime Video", "The Roku Channel"]);
  assert.equal(groups.flatMap(group => group.provider_ids).length, names.length);
  assert.deepEqual(groupStreamingProviders(groups), groups);
});
