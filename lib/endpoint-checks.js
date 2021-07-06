const fetch = require('node-fetch');

class EndpointChangeChecks {
  constructor({ sinceBatchCommitId, spectacleUrl }) {
    this.sinceBatchCommitId = sinceBatchCommitId;
    this.spectacle = new Spectacle(spectacleUrl);
    this.checks = {
      added: [],
      updated: [],
      removed: [],
    };
  }

  on(action, check) {
    this.checks[action].push(check);
    return this; // for chaining
  }

  async run() {
    const endpointChangesQuery = await this.spectacle.getEndpointChanges(
      this.sinceBatchCommitId
    );
    const checkResults = new CheckResults();
    for (const endpointChange of endpointChangesQuery.data.endpointChanges
      .endpoints) {
      const matchingRequest = await this.spectacle.getMatchingRequest(endpointChange);
      for (const check of this.checks[endpointChange.change.category]) {
        const checkResult = await check({
          endpointChange,
          // We pass this in as endpoint because in the context of a check it makes more sense
          endpoint: matchingRequest,
        });
        checkResults.handleResult(checkResult);
      }
    }
    return checkResults;
  }
}

class CheckResults {
  constructor() {
    this.results = [];
  }

  all() {
    return this.results;
  }

  handleResult(result) {
    if (result) this.results.push(result);
  }

  hasFailures() {
    return Boolean(this.results.length);
  }
}

class Spectacle {
  constructor(spectacleUrl) {
    this.spectacleUrl = spectacleUrl;
  }

  async getEndpointChanges(sinceBatchCommitId) {
    return await this.query({
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
  }

  async getMatchingRequest(endpointChange) {
    return (
      await this.query({
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
    ).data.requests.find(
      (request) =>
        request.pathId === endpointChange.pathId && request.method === endpointChange.method
    );
  }

  async query(body) {
    const result = await fetch(this.spectacleUrl, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    return await result.json();
  }
}

function displayResults(results) {
  if (results.hasFailures()) {
    console.log('API checks failed');
    for (const result of results.all()) {
      console.log(`- ${result}`);
    }
  } else {
    console.log('Passes all design guidelines');
  }
}

module.exports = {
  CheckResults,
  EndpointChangeChecks,
  displayResults,
};
