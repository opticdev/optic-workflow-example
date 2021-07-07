const fs = require('fs');
const { EndpointChangeChecks, displayResults } = require('./endpoint-checks');
const { Spectacle } = require('./spectacle');

const SPEC_PATH = process.env.SPEC_PATH || '.optic/api/specification.json';

main();

async function main() {
  const sinceBatchCommitId = await getSinceBatchCommitId();
  const endpointChanges = await EndpointChangeChecks.withSpectacle(SPEC_PATH, {
    sinceBatchCommitId,
  });
  endpointChanges.on('added', requireNotFoundWithGet);
  const results = await endpointChanges.run();
  displayResults(results);
  if (results.hasFailures()) process.exit(1);
}

async function getSinceBatchCommitId() {
  const baseSpec = JSON.parse(fs.readFileSync(process.env.BASE_SPEC_PATH));
  const spectacle = await Spectacle.forEvents(baseSpec);
  const batchCommitResults = await spectacle.getBatchCommits();
  return batchCommitResults.data?.batchCommits?.reduce(
    (result, batchCommit) => {
      return batchCommit.createdAt > result.createdAt ? batchCommit : result;
    }
  ).batchId;
}

async function requireNotFoundWithGet({ endpoint }) {
  if (!isMethod(endpoint, 'GET')) return;
  return requireStatusCode(endpoint, 404);
}

function isMethod(endpoint, method) {
  return endpoint.method === method;
}

function hasStatusCode(endpoint, givenStatusCode) {
  return Boolean(
    endpoint.responses.find(({ statusCode }) => {
      return statusCode === givenStatusCode;
    })
  );
}

function requireStatusCode(endpoint, statusCode) {
  if (!hasStatusCode(endpoint, statusCode)) {
    return `Endpoint ${endpoint.absolutePathPatternWithParameterNames} ${endpoint.method} does not have a ${statusCode} status code`;
  }
}
