import assert from "node:assert/strict";
import test from "node:test";
import { isMyKadEligible, normalizeMyKad } from "./mykad";

test("normalizes MyKad numbers with or without separators", () => {
  assert.equal(normalizeMyKad("900101-14-1234"), "900101141234");
  assert.equal(normalizeMyKad("900101141234"), "900101141234");
});

test("accepts only MyKad numbers ending in an even digit", () => {
  const evenNumber = normalizeMyKad("900101-14-1234");
  const oddNumber = normalizeMyKad("900101-14-1235");

  assert.ok(evenNumber);
  assert.ok(oddNumber);
  assert.equal(isMyKadEligible(evenNumber), true);
  assert.equal(isMyKadEligible(oddNumber), false);
});

test("rejects malformed MyKad numbers", () => {
  assert.equal(normalizeMyKad("900101-1-1234"), null);
});
