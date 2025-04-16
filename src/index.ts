import * as fs from 'fs';

import * as path from 'path';

import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

import type { Stats, InputTemplate, OutputFile } from './types';
import millisecondsToMinuteSeconds from './utils';
import DefaultReport from './defaultReport';

const initialStats = (): Stats => ({
  testsInSuite: 0,
  totalTestsRun: 0,
  expectedResults: 0,
  unexpectedResults: 0,
  flakyTests: 0,
  testMarkedSkipped: 0,
  failureFree: true,
  durationCPU: 0,
  durationSuite: 0,
  avgTestDuration: 0,
  formattedDurationSuite: '',
  formattedAvgTestDuration: '',
  expected: {},
  failures: {},
  flakes: {},
  tests: {},
  workers: 1,
});

class PlaywrightReportSummary implements Reporter {
  basePath: string | null;

  inputTemplate: InputTemplate;

  outputFile: OutputFile;

  stats: Stats;

  private endTime: number;

  private startTime: number;

  constructor(
    options: {
      basePath?: string;
      outputFile?: string;
      inputTemplate?: () => string;
    } = {},
  ) {
    this.basePath = options.basePath ?? null;
    this.outputFile = options.outputFile;
    this.inputTemplate = options.inputTemplate;
  }

  onBegin(config, suite) {
    this.startTime = Date.now();
    this.stats = initialStats();
    this.stats.testsInSuite = suite.allTests().length;
    this.stats.workers = config.workers;
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    const outcome = test.outcome();
    const { retry, status } = result;

    const { file, line, column } = test.location;
    const filePath = this.basePath
      ? file.slice(this.basePath.length + 1)
      : file;
    const testPath = `${filePath}:${line}:${column}`;
    this.stats.tests[testPath] = status;

    switch (outcome) {
      case 'expected':
        this.stats.expected[testPath] = status;
        this.stats.expectedResults += 1;
        break;

      case 'flaky':
        this.stats.flakes[testPath] = status;
        this.stats.flakyTests += 1;
        break;

      case 'skipped':
        this.stats.testMarkedSkipped += 1;
        break;

      case 'unexpected':
        this.stats.failures[testPath] = status;
        if (retry === 0) this.stats.unexpectedResults += 1;
        break;

      default:
        break;
    }
    this.stats.totalTestsRun += 1;
    this.stats.durationCPU += result.duration;
    this.stats.failureFree =
      this.stats.unexpectedResults - this.stats.flakyTests === 0;
  }

  async onEnd() {
    this.endTime = Date.now();
    this.stats.durationSuite = this.endTime - this.startTime;
    this.stats.avgTestDuration = Math.ceil(
      this.stats.durationCPU / (this.stats.totalTestsRun || 1),
    );
    this.stats.formattedAvgTestDuration = millisecondsToMinuteSeconds(
      this.stats.avgTestDuration,
    );
    this.stats.formattedDurationSuite = millisecondsToMinuteSeconds(
      this.stats.durationSuite,
    );
    Object.keys(this.stats.flakes).forEach((flake) => {
      delete this.stats.expected[flake];
      delete this.stats.failures[flake];
    });
    const outputPath = this.outputFile || 'results.txt';
    outputReport(this.stats, outputPath, this.inputTemplate);
  }
}

function outputReport(
  stats: Stats,
  outputFile: string,
  inputTemplate?: (stats: Stats) => string,
) {
  let reportString: string;
  const report = new DefaultReport(stats);
  if (typeof inputTemplate === 'undefined')
    reportString = report.templateReport();
  else {
    reportString = inputTemplate(stats);
    if (typeof reportString !== 'string') {
      throw new Error('custom input templates must return a string');
    }
  }

  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, reportString);
}

export default PlaywrightReportSummary;
