const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());

// CONFIGURAÇÕES - ALTERE ESTES VALORES
const VERIFY_TOKEN = 'meutoken123disparo'; // Coloque seu token
const PAGE_ACCESS_TOKEN = 'SEU_TOKEN_DE_ACESSO_DA_PAGINA'; // Token estendido da página Meta
const EMAIL_USER = 'seu.email@gmail.com'; // Email que vai enviar
const EMAIL_PASS = 'sua_senha_de_app'; // Senha de app do Gmail
const EMAIL_DESTINO = 'destino@empresa.com'; // Email que vai receber os leads

const PORT = process.env.PORT || 3000;

// Configurar transportador de email
const transporter = nodemailer.createTransporter({
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

            // Enviar email
            await transporter.sendMail({
              from: EMAIL_USER,
              to: EMAIL_DESTINO,
              subject: `Novo Lead Facebook - ${campos.full_name || campos.email || 'Lead'}`,
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
