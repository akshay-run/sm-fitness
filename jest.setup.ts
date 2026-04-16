import "@testing-library/jest-dom";

// Vitest compatibility shim so existing tests can run under Jest.
// This keeps migration incremental while Jest is the default runner.
const viCompat = {
  fn: jest.fn,
  mock: jest.mock,
  mocked: jest.mocked,
  spyOn: jest.spyOn,
  clearAllMocks: jest.clearAllMocks,
  resetAllMocks: jest.resetAllMocks,
  restoreAllMocks: jest.restoreAllMocks,
};

Object.assign(globalThis, { vi: viCompat });
