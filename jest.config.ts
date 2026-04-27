import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/jest.polyfills.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/*.test.{ts,tsx}",
  ],
  coverageThreshold: {
    global: {},
    // Phase C gates: enforce minimums on critical files instead of an unrealistic global threshold
    // (pages/components not covered by unit tests would otherwise block coverage runs).
    "lib/dateUtils.ts": { branches: 90 },
    "lib/validations/*.ts": { branches: 90 },
    "app/api/members/route.ts": { branches: 85 },
    "app/api/memberships/route.ts": { branches: 85 },
    "app/api/payments/route.ts": { branches: 85 },
    "app/api/cron/backup/route.ts": { branches: 85 },
    "app/api/cron/reminders/route.ts": { branches: 85 },
    "app/api/reports/summary/route.ts": { branches: 80 },
    "components/payments/PaymentForm.tsx": { branches: 80 },
    "components/memberships/MembershipForm.tsx": { branches: 80 },
    "components/settings/PlansManager.tsx": { branches: 75 },
    "components/ui/FlowSteps.tsx": { branches: 95 },
  },
};

export default createJestConfig(config);
