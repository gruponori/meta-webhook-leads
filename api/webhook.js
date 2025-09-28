const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());

// CONFIGURAÇÕES - IDEALMENTE USE VARIÁVEIS DE AMBIENTE
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'Podecrer22'; // Token do Meta Developers
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'EAASZASWHBUjoBPmmKJZBkORJkB2dLmLuQkYwPgdynuhn3SNBcm8W52OiL0PP48WBjwrcZB8igOGW0PNytZCsEZAbIDz5z5cOyO9qrH5UrIUZBPkzkAJRXidBjsd2ZAFgvfvaeYxUo1vYZAD1fGgDZCBbcIkujSNnfPAIr0nrjSwX7UJtfUFRRHnFfluVmZA1fMqcRJNXE66Ba0blWf48BGFmpoZAKkmrgu1aCYbhjG2WHiSIQZDZD'; // Token real
const EMAIL_USER = process.env.EMAIL_USER || 'gnorimkt@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'gioq aiuy coev oglu';

// Destinatários separados por vírgula
const EMAIL_DESTINO = [
  'daniela.oliveira@bcef.com.br',
  'marcelo@gruponori.com',
  'giseleo@gruponori.com',
  'mkt@gruponori.com'
].join(',');

const PORT = process.env.PORT || 3000;

// Configurar nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// GET para validar webhook Facebook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso');
    res.status(200).send(challenge);
  } else {
    console.warn('Falha na verificação do webhook');
    res.sendStatus(403);
  }
});

// POST para receber leads
app.post('/webhook', async (req, res) => {
  console.log('Recebendo webhook POST body:', JSON.stringify(req.body));

  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'leadgen') {
          const leadData = change.value;
          const leadId = leadData.leadgen_id;
          console.log(`Processando lead ID: ${leadId}`);

          try {
            const response = await axios.get(
              `https://graph.facebook.com/v18.0/${leadId}`,
              { params: { access_token: PAGE_ACCESS_TOKEN } }
            );

            const lead = response.data;
            console.log('Dados completos do lead obtidos:', lead);

            const campos = {};
            lead.field_data.forEach(field => {
              campos[field.name] = field.values.join(', ');
            });

            if (!campos) {
              console.warn('Lead não contém campos preenchidos');
            }

            const dataFormatada = new Date(lead.created_time).toLocaleString('pt-BR');
            const camposTexto = Object.entries(campos).map(([k, v]) => `${k}: ${v}`).join('\n');
            const emailHTML = `
              <h2>Novo Lead Recebido!</h2>
              <p>Data/Hora: ${dataFormatada}</p>
              <p>Lead ID: ${lead.id}</p>
              <h3>Dados:</h3>
              <pre>${camposTexto}</pre>
            `;

            console.log('Enviando email para:', EMAIL_DESTINO);
            await transporter.sendMail({
              from: EMAIL_USER,
              to: EMAIL_DESTINO,
              subject: `Novo Lead Choes Franquias - ${campos.full_name || campos.email || 'Lead'}`,
              html: emailHTML
            });
            console.log('Email enviado com sucesso!');

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
