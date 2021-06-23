const fetch = require('node-fetch');

test('Retrieve existing user', async () => {
  const result = await fetch(api('/users/jdoe')).then((res) => res.json());
  expect(result).toMatchSnapshot();
});

test('Retrieve unknown user', async () => {
  const result = await fetch(api('/users/unknown')).then((res) => res.json());
  expect(result).toMatchSnapshot();
});

function api(path) {
  return `${process.env.OPTIC_PROXY}${path}`;
}
