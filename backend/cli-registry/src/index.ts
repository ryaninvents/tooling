import type Commander from "commander";

export interface CliRegistry {
  use(spec: (program: Commander.Command) => void): CliRegistry;
  attachToProgram(program: Commander.Command): void;
  log(...args: Parameters<typeof console.log>): void;
}

export function createCliRegistry(): CliRegistry {
  const specs: Array<(program: Commander.Command) => void> = [];
  return {
    use(spec) {
      specs.push(spec);
      return this;
    },
    attachToProgram(program) {
      for (const spec of specs) {
        spec(program);
      }
    },
    log(...args) {
      // eslint-disable-next-line no-console
      console.log(...args);
    },
  };
}
