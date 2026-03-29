// Authentification simple (login/password)
const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM teachers WHERE email = ? AND password = ?', [email, password], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });
    res.json({ id: user.id, name: user.name, email: user.email });
  });
});

module.exports = router;
