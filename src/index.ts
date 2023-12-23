import * as fs from 'fs';

import * as path from 'path';

import {
  Reporter,
  TestCase,
  TestResult,
  TestStatus,
} from '@playwright/test/reporter';

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
  failures: {},
  flakes: {},
  workers: 1,
});

class PlaywrightReportSummary implements Reporter {
  outputFile: OutputFile;

  private startTime: number;

  private endTime: number;

  inputTemplate: InputTemplate;

  resultMap: Map<string, TestStatus>;

  stats: Stats;

  constructor(
    options: { outputFile?: string; inputTemplate?: () => string } = {},
  ) {
    this.outputFile = options.outputFile;
    this.inputTemplate = options.inputTemplate;
    this.resultMap = new Map();
  }

  onBegin(config, suite) {
    this.startTime = Date.now();
    this.stats = initialStats();
    this.stats.testsInSuite = suite.allTests().length;
    this.stats.workers = config.workers;
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    const outcome = test.outcome();
    const { retry } = result;

    const { file, line, column } = test.location;
    const testPath = `${file}:${line}:${column}`;
    if (this.resultMap.get(testPath) !== 'passed') this.resultMap.set(testPath, result.status);
    this.stats.tests[testPath] = this.resultMap.get(testPath);

    switch (outcome) {
      case 'expected':
        this.stats.expectedResults += 1;
        break;
      case 'flaky':
        this.stats.flakes[testPath] = this.resultMap.get(testPath);
        this.stats.flakyTests += 1;
        break;
      case 'skipped':
        this.stats.testMarkedSkipped += 1;
        break;
      case 'unexpected':
        this.stats.failures[testPath] = this.resultMap.get(testPath);
        if (retry === 0) this.stats.unexpectedResults += 1;
        break;
      default:
        break;
    }
    this.stats.totalTestsRun += 1;
    this.stats.durationCPU += result.duration;
    this.stats.failureFree = (this.stats.unexpectedResults - this.stats.flakyTests) === 0;
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
    outputReport(this.stats, this.inputTemplate, this.outputFile);
  }
}

function outputReport(
  stats: Stats,
  inputTemplate?: Function,
  outputFile: string = 'results.txt',
) {
  let reportString: string;
  const report = new DefaultReport(stats);
  if (typeof inputTemplate === 'undefined') {
    reportString = report.templateReport();
  } else {
    reportString = inputTemplate(stats);
    if (typeof reportString !== 'string') {
      throw new Error('custom input templates must return a string');
    }
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, reportString);
}

export default PlaywrightReportSummary;
