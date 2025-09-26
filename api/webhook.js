const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());

// CONFIGURAÇÕES - ALTERE ESTES VALORES
const VERIFY_TOKEN = 'Podecrer22'; // Use exatamente o token que informar no Meta Developers
const PAGE_ACCESS_TOKEN = 'EAASZASWHBUjoBPnckd81PqmhFG47pqHd6ewj0Gkx2AxZCuQj0QH8mbJL3MUuWiq2wuyeIWN0GQvq9Hjxg0WQDlrA6AZBZBT2K1dY6jLLxnzKn2P4TOvaiCUOlZCkf8uGiuhxGWWoZAXAg2eZCTDeK6m32gjvC9IZAcUBwrr13I0QTC3sOBpFefrWzO6GDoIZA7HTIzzgpNrtebC4RGmlotNsNnavTj7dcrb3m';
const EMAIL_USER = 'gnorimkt@gmail.com';
const EMAIL_PASS = 'gioq aiuy coev oglu';
// Lista de e-mails separados por vírgula para o envio
const EMAIL_DESTINO = [
  'daniela.oliveira@bcef.com.br',
  'marcelo@gruponori.com',
  'giseleo@gruponori.com',
  'mkt@gruponori.com'
].join(',');

const PORT = process.env.PORT || 3000;

// Configurar transportador de email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// GET: Verificação do webhook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST: Receber notificações de leads
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'leadgen') {
          const leadData = change.value;
          const leadId = leadData.leadgen_id;

          try {
            // Buscar dados completos do lead
            const response = await axios.get(
              `https://graph.facebook.com/v18.0/${leadId}`,
              {
                params: { access_token: PAGE_ACCESS_TOKEN }
              }
            );

            const lead = response.data;

            // Extrair campos do formulário
            const campos = {};
            lead.field_data.forEach(field => {
              campos[field.name] = field.values.join(', ');
            });

            // Montar email
            const dataFormatada = new Date(lead.created_time).toLocaleString('pt-BR');
            const camposTexto = Object.entries(campos).map(([k, v]) => `${k}: ${v}`).join('\n');
            const emailHTML = `
              <h2>Novo Lead Recebido!</h2>
              <p>Data/Hora: ${dataFormatada}</p>
              <p>Lead ID: ${lead.id}</p>
              <h3>Dados:</h3>
              <pre>${camposTexto}</pre>
            `;

            // Enviar email para vários destinatários
            await transporter.sendMail({
              from: EMAIL_USER,
              to: EMAIL_DESTINO,
              subject: `Novo Lead Choes Franquias - ${campos.full_name || campos.email || 'Lead'}`,
              html: emailHTML
            });

          } catch (error) {
            console.error('Erro ao processar lead:', error.message || error);
          }
        }
      }
    }
  }

  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Webhook rodando na porta ${PORT}`);
});
