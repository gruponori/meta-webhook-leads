// api/webhook.js

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());

// CONFIGURAÇÕES – use variáveis de ambiente no Vercel
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'Podecrer22';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN  || 'EAASZASWHBUjoBPmmKJZBkORJkB2dLmLuQkYwPgdynuhn3SNBcm8W52OiL0PP48WBjwrcZB8igOGW0PNytZCsEZAbIDz5z5cOyO9qrH5UrIUZBPkzkAJRXidBjsd2ZAFgvfvaeYxUo1vYZAD1fGgDZCBbcIkujSNnfPAIr0nrjSwX7UJtfUFRRHnFfluVmZA1fMqcRJNXE66Ba0blWf48BGFmpoZAKkmrgu1aCYbhjG2WHiSIQZDZD'; 
const EMAIL_USER = process.env.EMAIL_USER || 'gnorimkt@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'gioq aiuy coev oglu';
const EMAIL_DESTINO = [
  'daniela.oliveira@bcef.com.br',
  'marcelo@gruponori.com',
  'giseleo@gruponori.com',
  'mkt@gruponori.com'
].join(',');

// Validar variáveis de ambiente obrigatórias
if (!PAGE_ACCESS_TOKEN) {
  console.error('⚠️ PAGE_ACCESS_TOKEN não definido!');
  process.exit(1);
}
if (!EMAIL_USER || !EMAIL_PASS) {
  console.error('⚠️ EMAIL_USER ou EMAIL_PASS não definidos!');
  process.exit(1);
}

// Configurar nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

// GET de verificação do webhook
app.get('/api/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso');
    return res.status(200).send(challenge);
  }
  console.warn('Falha na verificação do webhook');
  return res.sendStatus(403);
});

// POST para receber notificações de lead
app.post('/api/webhook', async (req, res) => {
  console.log('Recebendo webhook POST body:', JSON.stringify(req.body));

  if (req.body.object === 'page') {
    for (const entry of req.body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'leadgen') {
          const leadId = change.value.leadgen_id;
          console.log(`Processando lead ID: ${leadId}`);

          try {
            // Busca dados completos do lead
            const response = await axios.get(
              `https://graph.facebook.com/v18.0/${leadId}`,
              {
                params: {
                  access_token: PAGE_ACCESS_TOKEN,
                  fields: 'id,created_time,field_data,full_name,email'
                }
              }
            );

            const lead = response.data;
            console.log('Dados completos do lead obtidos:', lead);

            // Extrair campos dinâmicos
            const campos = {};
            if (Array.isArray(lead.field_data)) {
              lead.field_data.forEach(f => {
                campos[f.name] = f.values.join(', ');
              });
            }
            // Assegurar fallback para full_name e email diretos
            if (lead.full_name) campos.full_name = lead.full_name;
            if (lead.email) campos.email = lead.email;

            const dataFmt = new Date(lead.created_time).toLocaleString('pt-BR');
            const camposTexto = Object.entries(campos)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n');

            const emailHTML = `
              <h2>Novo Lead Recebido!</h2>
              <p><strong>Data/Hora:</strong> ${dataFmt}</p>
              <p><strong>Lead ID:</strong> ${lead.id}</p>
              <h3>Dados:</h3>
              <pre>${camposTexto}</pre>
            `;

            console.log('Enviando email para:', EMAIL_DESTINO);
            await transporter.sendMail({
              from: EMAIL_USER,
              to: EMAIL_DESTINO,
              subject: `Novo Lead Choes Franquias – ${campos.full_name || campos.email || 'Lead'}`,
              html: emailHTML
            });
            console.log('Email enviado com sucesso!');
          } catch (err) {
            // Logar erro detalhado para identificar parâmetros incorretos
            const detalhe = err.response?.data || err.message;
            console.error('Erro ao processar lead:', detalhe);
          }
        }
      }
    }
  }

  res.status(200).send('OK');
});

module.exports = app;
