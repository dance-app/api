export type FlowStep = {
  name: string;
  test: () => Promise<void>;
};

export function setupTestSteps(steps: FlowStep[]) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    it(`Step ${i + 1}: ${step.name}`, async () => {
      // Skip if previous step failed
      // TODO: this doesn't work
      if (i > 0) {
        const previousTestInfo = expect.getState().currentTestName;
        if (previousTestInfo?.includes('failed')) {
          return Promise.reject('Previous test failed');
        }
      }

      await step.test();
    });
  }
}
