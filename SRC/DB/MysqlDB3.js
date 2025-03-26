const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

// Middleware pour parser le corps des requêtes
app.use(express.json());

// Configuration de la connexion à la base de données
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Tam@1#',
    database: '2ieapi',
    connectionLimit: 10, // Nombre maximum de connexions simultanées
    waitForConnections: true, // Attendre une connexion disponible si le pool est plein
    queueLimit: 0 // Pas de limite pour la file d'attente
};

// Création du pool de connexions
const pool = mysql.createPool(dbConfig);

// Fonction utilitaire pour exécuter des requêtes
async function executeQuery(sql, params = []) {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        throw new Error(`Erreur lors de l'exécution de la requête: ${error.message}`);
    }
}

// Routes CRUD pour les étudiants
/**
 * Obtenir tous les étudiants
 * @route GET /etudiants
 */
app.get('/etudiants', async (req, res) => {
    try {
        const results = await executeQuery('SELECT * FROM etudiants');
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Obtenir un étudiant par son ID
 * @route GET /etudiants/:id
 */
app.get('/etudiants/:id', async (req, res) => {
    try {
        const [results] = await executeQuery('SELECT * FROM etudiants WHERE id = ?', [req.params.id]);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Étudiant non trouvé' });
        }
        res.status(200).json(results[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Créer un nouvel étudiant
 * @route POST /etudiants
 * @body {nom: string, prenom: string, date_naissance: string}
 */
app.post('/etudiants', async (req, res) => {
    try {
        const { nom, prenom, date_naissance } = req.body;
        if (!nom || !prenom || !date_naissance) {
            return res.status(400).json({ error: 'Nom, prénom et date de naissance sont requis' });
        }
        const result = await executeQuery(
            'INSERT INTO etudiants (nom, prenom, date_naissance) VALUES (?, ?, ?)',
            [nom, prenom, date_naissance]
        );
        res.status(201).json({
            id: result.insertId,
            nom,
            prenom,
            date_naissance
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Mettre à jour un étudiant existant
 * @route PUT /etudiants/:id
 * @body {nom?: string, prenom?: string, date_naissance?: string}
 */
app.put('/etudiants/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { nom, prenom, date_naissance } = req.body;
        
        const [existing] = await executeQuery('SELECT * FROM etudiants WHERE id = ?', [id]);
        if (!existing.length) {
            return res.status(404).json({ error: 'Étudiant non trouvé' });
        }

        let updateQuery = 'UPDATE etudiants SET ';
        const params = [];
        if (nom) {
            updateQuery += 'nom = ?,';
            params.push(nom);
        }
        if (prenom) {
            updateQuery += 'prenom = ?,';
            params.push(prenom);
        }
        if (date_naissance) {
            updateQuery += 'date_naissance = ?,';
            params.push(date_naissance);
        }
        updateQuery = updateQuery.slice(0, -1) + ' WHERE id = ?';
        params.push(id);

        await executeQuery(updateQuery, params);
        res.status(200).json({
            id,
            nom: nom || existing[0].nom,
            prenom: prenom || existing[0].prenom,
            date_naissance: date_naissance || existing[0].date_naissance
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Supprimer un étudiant
 * @route DELETE /etudiants/:id
 */
app.delete('/etudiants/:id', async (req, res) => {
    try {
        const [result] = await executeQuery('DELETE FROM etudiants WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Étudiant non trouvé' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Connexion à la base de données au démarrage
async function initializeDatabase() {
    try {
        
        // Création de la table étudiants si elle n'existe pas
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS etudiants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                date_naissance DATE NOT NULL
            )
        `);
        
        console.log('Connexion à la base de données établie avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la base de données:', error);
        process.exit(1);
    }
}

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    initializeDatabase()
    console.log(`Serveur démarré sur le port ${PORT}`);
});
