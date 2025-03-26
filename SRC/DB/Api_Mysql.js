// Importation des dépendances
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

// Middleware pour parser le corps des requêtes
app.use(express.json());

// Configuration de la connexion MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Ali@1#',
    database: '2ieapi',
});

// Routes CRUD

// CREATE - Ajouter un nouvel utilisateur
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, age } = req.body;
        const [result] = await db.execute(
            'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
            [name, email, age]
        );
        res.status(201).json({ id: result.insertId, name, email, age });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// READ - Obtenir tous les utilisateurs
app.get('/api/users', async (req, res) => {
    try {
        const [users] = await db.execute('SELECT * FROM users');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ - Obtenir un utilisateur par ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const [user] = await db.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (!user[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        res.json(user[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE - Mettre à jour un utilisateur
app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, email, age } = req.body;
        await db.execute(
            'UPDATE users SET name = ?, email = ?, age = ? WHERE id = ?',
            [name, email, age, req.params.id]
        );
        res.json({ message: 'Utilisateur mis à jour' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE - Supprimer un utilisateur
app.delete('/api/users/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Serveur démarré sur le port ${PORT}');
});


///////////////  TEST AVEC CURL

// # Créer un nouvel utilisateur
// curl -X POST http://localhost:3000/api/users \
//   -H "Content-Type: application/json" \
//   -d '{"name":"John Doe","email":"john@example.com","age":30}'

// # Obtenir tous les utilisateurs
// curl http://localhost:3000/api/users

// # Obtenir un utilisateur spécifique
// curl http://localhost:3000/api/users/1

// # Mettre à jour un utilisateur
// curl -X PUT http://localhost:3000/api/users/1 \
//   -H "Content-Type: application/json" \
//   -d '{"name":"John Doe Updated","email":"john2@example.com","age":31}'

// # Supprimer un utilisateur
// curl -X DELETE http://localhost:3000/api/users/1