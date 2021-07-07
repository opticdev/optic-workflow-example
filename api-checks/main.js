const { EndpointChangeChecks, displayResults } = require('./endpoint-checks');

const SPEC_PATH = process.env.SPEC_PATH || '.optic/api/specification.json'

main();

async function main() {
  const endpointChanges = await EndpointChangeChecks.withSpectacle(
    SPEC_PATH,
    {
      sinceBatchCommitId: process.env.SINCE_BATCH_COMMIT_ID,
    }
  );
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
