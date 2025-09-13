import { shellBuildContext } from './shellBuildContext.js';
import { nodeBuildContext } from './nodeBuildContext.js';
import { strategyBuildContext } from './strategyBuildContext.js';

// Default composition: Strategy(A=shell, B=node)
export const buildContext = strategyBuildContext(shellBuildContext, nodeBuildContext, {
  onError: (err) => {
    // Keep logging light; upstream can also log
    console.warn(`[buildContext] shell failed, falling back to node builder: ${err?.message || err}`);
  }
});

export { shellBuildContext, nodeBuildContext, strategyBuildContext };

