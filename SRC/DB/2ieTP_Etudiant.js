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
    password: 'Tam@1#',
    database: '2ieTP',
});

// Routes CRUD

// CREATE - Ajouter un nouvel étudiant
app.post('/api/etudiants', async (req, res) => {
    try {
        const { nom, prenom, age, date_de_naissance } = req.body;

        // Validate required fields
        if (!nom || !prenom || !date_de_naissance || age === undefined) {
            return res.status(400).json({ error: 'Missing required fields: nom, prenom, age, and date_de_naissance are required' });
        }

        const [result] = await db.execute(
            'INSERT INTO etudiant (nom, prenom, age, date_de_naissance) VALUES (?, ?, ?, ?)',
            [nom, prenom, age, date_de_naissance]
        );

        // Fetch the newly created étudiant
        const [newEtudiant] = await db.execute('SELECT * FROM etudiant WHERE id = ?', [result.insertId]);
        res.status(201).json(newEtudiant[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ - Obtenir tous les étudiants
app.get('/api/etudiants', async (req, res) => {
    try {
        const [etudiants] = await db.execute('SELECT * FROM etudiant');
        res.json(etudiants);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ - Obtenir un étudiant par ID
app.get('/api/etudiants/:id', async (req, res) => {
    try {
        const [etudiant] = await db.execute('SELECT * FROM etudiant WHERE id = ?', [req.params.id]);
        if (etudiant.length === 0) return res.status(404).json({ error: 'Étudiant non trouvé' });
        res.json(etudiant[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE - Mettre à jour un étudiant
app.put('/api/etudiants/:id', async (req, res) => {
    try {
        const { nom, prenom, age, date_de_naissance } = req.body;

        // Validate required fields
        if (!nom || !prenom || !date_de_naissance || age === undefined) {
            return res.status(400).json({ error: 'Missing required fields: nom, prenom, age, and date_de_naissance are required' });
        }

        const [updateResult] = await db.execute(
            'UPDATE etudiant SET nom = ?, prenom = ?, age = ?, date_de_naissance = ? WHERE id = ?;',
            [nom, prenom, age, date_de_naissance, req.params.id]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Étudiant non trouvé' });
        }

        // Fetch the updated étudiant
        const [updatedEtudiant] = await db.execute('SELECT * FROM etudiant WHERE id = ?', [req.params.id]);
        res.json(updatedEtudiant[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE - Supprimer un étudiant
app.delete('/api/etudiants/:id', async (req, res) => {
    try {
        const [deleteResult] = await db.execute('DELETE FROM etudiant WHERE id = ?', [req.params.id]);
        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Étudiant non trouvé' });
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});