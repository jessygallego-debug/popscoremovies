import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync('lib/monthly-watchlist.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

for (const status of [200, 201, 204, 403]) {
  const moduleExports = {};
  const calls = [];
  vm.runInNewContext(compiled, {
    exports: moduleExports,
    require: () => ({}),
    process: { env: { SUPABASE_URL: 'https://database.example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-only-key' } },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return new Response(status === 200 ? '[]' : status === 403 ? 'permission denied' : null, { status });
    },
    Response,
  });
  const action = moduleExports.suppressMonthlyWatchlistEmail('  Test@Example.invalid  ', 'bounce');
  if (status === 403) await assert.rejects(action, /Supabase request failed \(403\)/);
  else await action;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: 'test@example.invalid', reason: 'bounce' });
}
console.log('PASS: suppression writes accept JSON, empty 201, and 204 responses; database failures remain errors.');
