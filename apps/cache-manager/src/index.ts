import { createApp } from "./app";
import type { WorkerBindings, WorkerExecutionContext } from "./worker-env";

const app = createApp();

export default {
  fetch(request: Request, bindings: WorkerBindings, executionContext: WorkerExecutionContext) {
    return app.fetch(request, bindings, executionContext);
  }
};
