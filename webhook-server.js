const express = require('express');
const app = express();

const VERIFY_TOKEN = 'Podecrer22';

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  return res.sendStatus(403);
});

app.listen(process.env.PORT || 3000, () => console.log('Webhook rodando!'));


app.listen(PORT, () => {
  console.log(`Webhook rodando na porta ${PORT}`);
});

