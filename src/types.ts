export type Stats = {
  testsInSuite: number;
  totalTestsRun: number;
  expectedResults: number;
  unexpectedResults: number;
  flakyTests: number;
  testMarkedSkipped: number;
  failureFree: boolean;
  durationCPU: number;
  durationSuite: number;
  avgTestDuration: number;
  formattedDurationSuite: string;
  formattedAvgTestDuration: string;
  expected: object;
  failures: object;
  flakes: object;
  tests: object;
  workers: number;
};

export type OutputFile = string;

export type InputTemplate = () => string;
