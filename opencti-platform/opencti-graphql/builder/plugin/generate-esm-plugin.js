export const generateEsmPlugin = () => ({
  name: 'generate-esm',
  setup: ({ initialOptions }) => {
    initialOptions.format = 'esm';
    initialOptions.outExtension = {
      ...(initialOptions.outExtension ?? {}),
      '.js': '.mjs',
    };
    initialOptions.banner = {
      ...(initialOptions.banner ?? {}),
      // see https://github.com/evanw/esbuild/issues/1921#issuecomment-1439609735
      js: `
const { require, __filename, __dirname } = await (async () => {
  const { createRequire } = await import('node:module');
  const { fileURLToPath, URL } = await import('node:url');
  return {
    require: createRequire(import.meta.url),
    __filename: fileURLToPath(import.meta.url),
    __dirname: fileURLToPath(new URL('.', import.meta.url)),
  };
})();
`,
    };
  },
});
