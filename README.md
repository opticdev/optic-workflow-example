# Optic Workflow Example

## Setup

```sh
yarn global add @useoptic/cli
yarn install
```

## Running tests

```sh
api run test
```

To update snapshots, use:

```sh
api run test-update-shapshots
```

## Running checks

Set the `SPECTACLE_URL` and run:

```sh
node checks.js
```