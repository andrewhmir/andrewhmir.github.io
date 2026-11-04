/* In-process assertion runner.
   `node --test` spawns child processes with piped stdio, which fails with
   EPERM under the confined sandbox; this runs the checks in one process. */

const results = [];
export function check(name, fn) { results.push({ name, fn }); }
export function run() {
  let pass = 0, fail = 0;
  for (const { name, fn } of results) {
    try { fn(); pass++; console.log('ok   ' + name); }
    catch (e) { fail++; console.log('FAIL ' + name + '\n     ' + e.message); }
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
