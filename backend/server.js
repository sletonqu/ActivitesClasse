// Point d'entrée du backend Express pour Ma Classe Interactive
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Import des routes
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/students', require('./routes/students'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/results', require('./routes/results'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/import', require('./routes/import'));
app.use('/api/export', require('./routes/export'));

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur backend démarré sur http://localhost:${PORT}`);
});

module.exports = { app };