const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

// Configuration CORS
const corsOptions = {
    origin: 'http://localhost:3000', // Définit l'origine autorisée à faire des requêtes - Modifiez selon votre frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Liste des méthodes HTTP autorisées
    allowedHeaders: ['Content-Type', 'Authorization'], // Spécifie les en-têtes HTTP autorisés
    credentials: true // Permet l'envoi de cookies et d'informations d'authentification
};

app.use(cors(corsOptions));
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

// Fonction pour hasher le mot de passe
const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    } catch (error) {
        throw new Error(`Erreur lors du hashage du mot de passe: ${error.message}`);
    }
};

// Fonction pour vérifier le mot de passe
const verifyPassword = async (password, hashedPassword) => {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        throw new Error(`Erreur lors de la vérification du mot de passe: ${error.message}`);
    }
};

// Fonction d'initialisation de la base de données
async function initializeDatabase() {
    try {
        // Création de la connexion
        const connection = await pool.getConnection();
        
        // Création de la table étudiants si elle n'existe pas
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS etudiant (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                date_naissance DATE NOT NULL,
                password VARCHAR(255) NOT NULL,
                date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        connection.release();
        console.log('Connexion à la base de données établie avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la base de données:', error);
        process.exit(1);
    }
}

// Routes CRUD pour les étudiants
/**
 * Obtenir tous les étudiants
 * @route GET /etudiant
 */
app.get('/etudiant', async (req, res) => {
    try {
        const results = await executeQuery('SELECT id, nom, prenom, date_naissance, date_inscription FROM etudiant');
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Obtenir un étudiant par son ID
 * @route GET /etudiant/:id
 */
app.get('/etudiant/:id', async (req, res) => {
    try {
        const [results] = await executeQuery('SELECT id, nom, prenom, date_naissance, date_inscription FROM etudiant WHERE id = ?', [req.params.id]);
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
 * @route POST /etudiant
 * @body {nom: string, prenom: string, date_naissance: string, password: string}
 */
app.post('/etudiant', async (req, res) => {
    try {
        const { nom, prenom, date_naissance, password } = req.body;
        
        if (!nom || !prenom || !date_naissance || !password) {
            return res.status(400).json({ 
                error: 'Nom, prénom, date de naissance et mot de passe sont requis' 
            });
        }

        const hashedPassword = await hashPassword(password);

        const result = await executeQuery(
            'INSERT INTO etudiant (nom, prenom, date_naissance, password) VALUES (?, ?, ?, ?)',
            [nom, prenom, date_naissance, hashedPassword]
        );

        const newStudentResult = await executeQuery(
            'SELECT id, nom, prenom, date_naissance, date_inscription FROM etudiant WHERE id = ?',
            [result.insertId]
        );

        if (!newStudentResult || newStudentResult.length === 0) {
            return res.status(500).json({ error: 'Erreur lors de la récupération de l’étudiant créé' });
        }

        const newStudent = newStudentResult[0];
        res.status(201).json(newStudent);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Mettre à jour un étudiant existant
 * @route PUT /etudiant/:id
 * @body {nom?: string, prenom?: string, date_naissance?: string, password?: string}
 */
app.put('/etudiant/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { nom, prenom, date_naissance, password } = req.body;

        // Vérification si l'étudiant existe
        const [existing] = await executeQuery('SELECT * FROM etudiant WHERE id = ?', [id]);
        if (!existing.length) {
            return res.status(404).json({ error: 'Étudiant non trouvé' });
        }

        // Mise à jour des champs fournis
        let updateQuery = 'UPDATE etudiant SET ';
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
        if (password) {
            const hashedPassword = await hashPassword(password);
            updateQuery += 'password = ?,';
            params.push(hashedPassword);
        }
        updateQuery = updateQuery.slice(0, -1) + ' WHERE id = ?';
        params.push(id);

        await executeQuery(updateQuery, params);

        // Récupérer l'étudiant mis à jour
        const [updatedStudent] = await executeQuery('SELECT id, nom, prenom, date_naissance, date_inscription FROM etudiant WHERE id = ?', [id]);

        res.status(200).json(updatedStudent);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Démarrage du serveur
async function startServer() {
    await initializeDatabase();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Serveur démarré sur le port ${PORT}`);
    });
}

startServer();
