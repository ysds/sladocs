declare module 'process' {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        /**
         * The directory the user invoked `sladocs` from.
         */
        ROOT_DIR?: string;

        /**
         * `'1'` when running under the local CLI (file watcher + WS enabled).
         */
        HOT_RELOAD?: '1';

        /**
         * JSON-encoded list of project directories passed via CLI arguments.
         */
        DEFAULT_PROJECT_DIR?: string;
      }
    }
  }
}
