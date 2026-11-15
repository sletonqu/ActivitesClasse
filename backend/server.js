// Point d'entrée du backend Express pour Ma Classe Interactive
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit to allow base64 images and full sequence exports/imports

// Servir statiquement les captures d'écran et les images de vocabulaire
const path = require('path');
const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(__dirname, 'data');
const vocabImagesDir = path.join(dataDir, 'vocabulary-images');
app.use('/screenshots', express.static(path.join(dataDir, 'screenshots')));
app.use('/vocabulary-images', express.static(vocabImagesDir));
app.use('/api/vocabulary-images', express.static(vocabImagesDir));

// Import des routes
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/students', require('./routes/students'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/words', require('./routes/words'));
app.use('/api/vocabulary', require('./routes/vocabulary'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/results', require('./routes/results'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/import', require('./routes/import'));
app.use('/api/export', require('./routes/export'));
app.use('/api/system', require('./routes/system'));

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur backend démarré sur http://localhost:${PORT}`);
});

module.exports = { app };