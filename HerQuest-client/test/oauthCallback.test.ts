import { test } from "node:test";
import assert from "node:assert/strict";
import { completeAuthCallback, oauthCallbackError } from "../src/utils/oauthCallback.ts";

test("Does not treat a valid PKCE callback code as a login error", () => {
  assert.equal(oauthCallbackError("?code=single-use-code", ""), null);
});

test("Recognizes provider login cancellation in both query and hash", () => {
  assert.equal(
    oauthCallbackError("?error=access_denied", ""),
    "Login was canceled. Please try again.",
  );
  assert.equal(
    oauthCallbackError("", "#error_code=user_cancelled"),
    "Login was canceled. Please try again.",
  );
});

test("Does not pass raw provider descriptions or tokens into the app callback URL", () => {
  const message = oauthCallbackError(
    "?error=server_error&error_description=refresh_token%3Dprivate-value",
    "#access_token=private-access",
  );
  assert.equal(message, "Could not complete social login. Please try again.");
  assert.ok(!message?.includes("private"));
});

test("Does not break the login screen even when malformed percent-encoding is included", () => {
  assert.equal(
    oauthCallbackError("?error=%E0%A4%A&error_description=100%", ""),
    "Could not complete social login. Please try again.",
  );
});

test("Does not treat a callback containing only an error description as a success", () => {
  assert.equal(
    oauthCallbackError("?error_description=failed", ""),
    "Could not complete social login. Please try again.",
  );
});

const callback = (query: string) => new URL(`https://app.example/auth/callback${query}`);

test("Navigates to the dashboard only when a new session is issued from the current PKCE code", async () => {
  const auth = {
    async exchangeCodeForSession(code: string) {
      assert.equal(code, "current-code");
      return { data: { session: { user: { id: "new-user" } } }, error: null };
    },
  };
  assert.equal(await completeAuthCallback(callback("?code=current-code"), auth), "/dashboard");
});

test("Reports a login error for expired/missing codes or failed exchanges even if an existing session is present", async () => {
  const auth = {
    getSession: async () => ({ data: { session: { user: { id: "old-user" } } } }),
    exchangeCodeForSession: async () => ({
      data: { session: null },
      error: new Error("expired: private-code"),
    }),
  };
  for (const query of ["?code=expired", ""]) {
    const route = await completeAuthCallback(callback(query), auth);
    assert.match(route, /^\/login\?error=/);
    assert.doesNotMatch(route, /private-code/);
  }
});

test("Does not exchange the code if the provider cancels the login", async () => {
  let exchangeCalls = 0;
  const auth = {
    async exchangeCodeForSession() {
      exchangeCalls++;
      return { data: { session: null }, error: null };
    },
  };
  const route = await completeAuthCallback(callback("?code=unused#error=access_denied"), auth);
  assert.match(decodeURIComponent(route), /Login was canceled/);
  assert.equal(exchangeCalls, 0);
});