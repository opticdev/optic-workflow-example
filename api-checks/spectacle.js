const fs = require('fs');
const {
  InMemoryOpticContextBuilder,
} = require('@useoptic/spectacle/build/in-memory');
const OpticEngine = require('@useoptic/optic-engine-wasm');
const { makeSpectacle } = require('@useoptic/spectacle');

class Spectacle {
  constructor(spectacle) {
    this.spectacle = spectacle;
  }

  static async forFile(filename) {
    const events = JSON.parse(fs.readFileSync(filename));
    return await Spectacle.forEvents(events);
  }

  static async forEvents(events) {
    const initialOpticContext = await InMemoryOpticContextBuilder.fromEvents(
      OpticEngine,
      events
    );
    const spectacle = await makeSpectacle(initialOpticContext);
    return new Spectacle(spectacle);
  }

  async getEndpointChanges(sinceBatchCommitId) {
    return await this.spectacle.queryWrapper({
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
      await this.spectacle.queryWrapper({
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
        request.pathId === endpointChange.pathId &&
        request.method === endpointChange.method
    );
  }

  async getBatchCommits() {
    return await this.spectacle.queryWrapper({
      query: `{
        batchCommits {
          createdAt
          batchId
        }
      }`,
      variables: {},
    });
  }
}

async function getSinceBatchCommitId(specFilename) {
  const baseSpec = JSON.parse(fs.readFileSync(specFilename));
  const spectacle = await Spectacle.forEvents(baseSpec);
  const batchCommitResults = await spectacle.getBatchCommits();
  return batchCommitResults.data?.batchCommits?.reduce(
    (result, batchCommit) => {
      return batchCommit.createdAt > result.createdAt ? batchCommit : result;
    }
  ).batchId;
}

module.exports = { Spectacle, getSinceBatchCommitId };
