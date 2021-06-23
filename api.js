const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const users = {
  jdoe: {
    name: 'Jane Doe',
    email: 'jdoe@example.com'
  },
};

app.get('/users/:username', (req, res) => {
  const user = users[req.params.username];

  if (!user) {
    return res
      .status(404)
      .setHeader('Content-Type', 'application/problem+json')
      .json({
        title: `User ${req.params.username} not found`,
      });
  }

  res.json(user);
});

app.get('/users2/:username', (req, res) => {
  const user = users[req.params.username];

  if (!user) {
    return res
      .status(404)
      .setHeader('Content-Type', 'application/problem+json')
      .json({
        title: `User ${req.params.username} not found`,
      });
  }

  res.json(user);
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
