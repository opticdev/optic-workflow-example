const path = require('path');
const { Spectacle } = require('./spectacle');

class EndpointChangeChecks {
  constructor({ sinceBatchCommitId, spectacle }) {
    this.sinceBatchCommitId = sinceBatchCommitId;
    this.spectacle = spectacle;
    this.checks = {
      added: [],
      updated: [],
      removed: [],
    };
  }

  static async withSpectacle(specFilename, options) {
    const spectacle = await Spectacle.forFile(path.join('..', specFilename));
    return new EndpointChangeChecks({ ...options, spectacle });
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
      const matchingRequest = await this.spectacle.getMatchingRequest(
        endpointChange
      );
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

// async function getLatestBatchCommit(events) {
//   if (events.length < 1) {
//     return null;
//   }

//   // Mostly copied from `opticdev/optic/workspaces/changelog/src/index.ts
//   const initialOpticContext = await InMemoryOpticContextBuilder.fromEvents(
//     OpticEngine,
//     events
//   );
//   const initialSpectacle = await makeSpectacle(initialOpticContext);

//   const batchCommitResults = await initialSpectacle.queryWrapper({
//     query: `{
//       batchCommits {
//         createdAt
//         batchId
//       }
//     }`,
//     variables: {},
//   });

//   const latestBatchCommit = batchCommitResults.data?.batchCommits?.reduce(
//     (result, batchCommit) => {
//       return batchCommit.createdAt > result.createdAt ? batchCommit : result;
//     }
//   );

//   return latestBatchCommit.batchId;
// }

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
