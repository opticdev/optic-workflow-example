const fetch = require('node-fetch');

main();

async function main() {
  const results = await applyDesignGuidelines(
    process.env.SINCE_BATCH_COMMIT_ID
  );
  if (results.length) {
    console.log('API checks failed');
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  } else {
    console.log('Passes all design guidelines');
  }
}

async function applyDesignGuidelines(sinceBatchCommitId) {
  const endpointChangesResult = await querySpectacle({
    query: `query GetEndpointChanges($sinceBatchCommitId: String!) {
      endpointChanges(sinceBatchCommitId: $sinceBatchCommitId) {
        endpoints {
          change {
            category
          }
          pathId
          path
          method
        }
      }
    }`,
    variables: { sinceBatchCommitId },
  });

  const addedEndpoints =
    endpointChangesResult.data.endpointChanges.endpoints.filter(
      (endpoint) => endpoint.change.category === 'added'
    );

  const messages = [];

  for (const endpoint of addedEndpoints) {
    const requestQuery = (
      await querySpectacle({
        query: `{
        requests {
          absolutePathPatternWithParameterNames
          method
          pathId
          responses {
            id
            statusCode
          }
        }
      }`,
        variables: {},
      })
    ).data.requests.filter(
      (request) =>
        request.pathId === endpoint.pathId && request.method === endpoint.method
    );

    if (!requestQuery.length) return messages;
    const request = requestQuery[0];

    let hasClientErrorStatusCodes = false;

    for (const response of request.responses) {
      if (response.statusCode >= 400 && response.statusCode < 500) {
        hasClientErrorStatusCodes = true;
        break;
      }
    }

    if (!hasClientErrorStatusCodes)
      messages.push(
        `Endpoint ${request.absolutePathPatternWithParameterNames} ${endpoint.method} does not have a 4xx status code`
      );
  }

  return messages;
}

async function querySpectacle(body) {
  const result = await fetch(process.env.SPECTACLE_URL, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  return await result.json();
}
