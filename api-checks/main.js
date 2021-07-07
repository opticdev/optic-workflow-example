const fs = require('fs');
const { EndpointChangeChecks, displayResults } = require('./endpoint-checks');
const { getSinceBatchCommitId } = require('./spectacle');

// This allows for changing the current spec path
const SPEC_PATH = process.env.SPEC_PATH || '.optic/api/specification.json';

main();

async function main() {
  const sinceBatchCommitId = await getSinceBatchCommitId(
    process.env.BASE_SPEC_PATH
  );
  const endpointChanges = await EndpointChangeChecks.withSpectacle(SPEC_PATH, {
    sinceBatchCommitId,
  });
  endpointChanges.on('added', requireNotFoundWithGet);
  const results = await endpointChanges.run();
  displayResults(results);
  if (results.hasFailures()) process.exit(1);
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
