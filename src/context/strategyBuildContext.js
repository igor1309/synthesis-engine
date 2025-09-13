// Composes two builders (A primary, B fallback). Each builder: async (files, options) => string
export function strategyBuildContext(builderA, builderB, { onError } = {}) {
  return async function build(files, options = {}) {
    try {
      return await builderA(files, options);
    } catch (err) {
      if (onError) onError(err, 'A');
      return await builderB(files, options);
    }
  };
}

