import type { Queue, Worker, Processor, QueueOptions } from "bullmq";

export interface BullMqRegistry<
  dataType,
  resultType,
  nameType extends string = string,
> {
  define<
    localDataType extends dataType = dataType,
    localResultType extends resultType = resultType,
    localNameType extends nameType = nameType,
  >(
    workerName: localNameType,
    processor: Processor<localDataType, localResultType, localNameType>,
  ): void;
  registerWorkers(
    bullModule: BullMqModule<dataType, resultType, nameType>,
  ): void;
  listWorkers(): Iterable<
    Omit<BullMqWorkerSpec<dataType, resultType, nameType>, "processor">
  >;
}

export interface BullMqWorkerSpec<
  dataType,
  resultType,
  nameType extends string = string,
> {
  workerName: nameType;
  processor: Processor<dataType, resultType, nameType>;
}

export interface BullMqModule<dataType, resultType, nameType extends string = string> {
  getQueue(
    name: nameType,
    opts?: Omit<QueueOptions, "connection">,
  ): Queue<dataType, resultType, nameType>;
  createWorker<
    localDataType extends dataType = dataType,
    localResultType extends resultType = resultType,
    localNameType extends nameType = nameType,
  >(
    name: localNameType,
    processor: Processor<localDataType, localResultType, localNameType>,
  ): Worker;
  getWorker<
    localDataType extends dataType = dataType,
    localResultType extends resultType = resultType,
    localNameType extends nameType = nameType,
  >(
    name: localNameType,
  ): Worker<localDataType, localResultType, localNameType> | null;
  allWorkers(): Iterable<Worker>;
  readonly workerCount: number;
}

export function createBullMqRegistry<
  dataType,
  resultType,
  nameType extends string = string,
>(): BullMqRegistry<dataType, resultType, nameType> {
  const workerHandlers: Array<
    BullMqWorkerSpec<dataType, resultType, nameType>
  > = [];
  return {
    define<
      localDataType extends dataType = dataType,
      localResultType extends resultType = resultType,
      localNameType extends nameType = nameType,
    >(
      workerName: localNameType,
      processor: Processor<localDataType, localResultType, localNameType>,
    ) {
      workerHandlers.push({ workerName, processor });
    },
    registerWorkers({ createWorker }) {
      for (const { workerName, processor } of workerHandlers) {
        createWorker(workerName, processor);
      }
    },
    *listWorkers() {
      for (const { workerName } of workerHandlers) {
        yield { workerName };
      }
    },
  };
}
