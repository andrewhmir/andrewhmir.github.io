/* The agent component library's guard. Runs the validator in-process.

   `tools/library-check.mjs` exports its checks; this file registers them with
   the repo's in-process harness so `npm test` runs them after the six existing
   suites. The validator reads the live sources and docs/library/ on every run —
   there is no cached or generated state to refresh. */
import { checks } from '../tools/library-check.mjs';
import { check, run } from './harness.mjs';

for (const c of checks()) check(c.id + ' ' + c.name, c.fn);
run();
