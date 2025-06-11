export type FlowStep = {
  name: string;
  test: () => Promise<void>;
};

export function setupSequentialFlow(steps: FlowStep[]) {
  let failedStep = null;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    it(`Step ${i + 1}: ${step.name}`, async () => {
      if (failedStep !== null) {
        throw new Error(`Skipped due to previous failure in: ${failedStep}`);
      }
      try {
        await step.test();
      } catch (error) {
        failedStep = i + 1;
        throw error;
      }
    });
  }
}
