import fs from 'node:fs';
import crypto from 'node:crypto';

const token = process.env.ACTIONS_RUNTIME_TOKEN;
const base = process.env.ACTIONS_RESULTS_URL;
const name = process.env.ART_NAME;
if (!token || !base) throw new Error('missing runtime env');
console.log('results url host:', new URL(base).host);

const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
const m = /Actions\.Results:([^:\s]+):([^:\s]+)/.exec(claims.scp || '');
if (!m) throw new Error('no Actions.Results scope: ' + claims.scp);
const workflowRunBackendId = m[1];
const workflowJobRunBackendId = m[2];

const ep = (p) => new URL(p, new URL(base).origin).href;
const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` };

const r = await fetch(ep('/twirp/github.actions.results.api.v1.ArtifactService/CreateArtifact'), {
  method: 'POST',
  headers,
  body: JSON.stringify({ workflowRunBackendId, workflowJobRunBackendId, name, version: 7, mimeType: { value: 'application/zip' } }),
});
const ct = await r.text();
console.log('create', r.status, ct);
if (!r.ok) process.exit(1);
const created = JSON.parse(ct);

const zip = fs.readFileSync('payload.zip');
const up = await fetch(created.signedUploadUrl, {
  method: 'PUT',
  headers: { 'x-ms-blob-type': 'BlockBlob', 'content-type': 'application/zip' },
  body: zip,
});
console.log('blob upload', up.status, (await up.text()).slice(0, 300));

const hash = 'sha256:' + crypto.createHash('sha256').update(zip).digest('hex');
const f = await fetch(ep('/twirp/github.actions.results.api.v1.ArtifactService/FinalizeArtifact'), {
  method: 'POST',
  headers,
  body: JSON.stringify({ workflowRunBackendId, workflowJobRunBackendId, name, size: String(zip.length), hash: { value: hash } }),
});
console.log('finalize', f.status, await f.text());
