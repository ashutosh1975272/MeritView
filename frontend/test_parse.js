const stored = JSON.stringify({ state: { accessToken: "test_access", refreshToken: "test_refresh" }, version: 0 });

let accessToken = null;
try {
  const { state } = JSON.parse(stored);
  accessToken = state.accessToken;
} catch (e) {}
console.log("Token:", accessToken);
