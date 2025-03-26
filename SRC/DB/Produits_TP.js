const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

// Configuration CORS
const corsOptions = {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Configuration de la connexion à la base de données
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Tam@1#',
    database: '2ieapi',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
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

// Fonction d'initialisation de la base de données
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        // Création de la table categories
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom_categories VARCHAR(100) NOT NULL UNIQUE
            )
        `);
        
        // Création de la table types
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom_types VARCHAR(100) NOT NULL UNIQUE
            )
        `);
        
        // Création de la table produits avec date_creation sans DEFAULT
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS produits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom_produit VARCHAR(255) NOT NULL,
                date_expiration DATE NOT NULL,
                date_creation DATETIME, 
                id_categories INT,
                id_types INT,
                FOREIGN KEY (id_categories) REFERENCES categories(id) ON DELETE SET NULL,
                FOREIGN KEY (id_types) REFERENCES types(id) ON DELETE SET NULL
            )
        `);
        
        connection.release();
        console.log('Initialisation des tables effectuée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la base de données:', error);
        process.exit(1);
    }
}

// Fonction pour obtenir les produits liés
async function getLinkedProducts(table, columnName, id) {
    try {
        const products = await executeQuery(`
            SELECT id, nom_produit 
            FROM produits 
            WHERE ${columnName} = ?
        `, [id]);
        return products;
    } catch (error) {
        throw new Error(`Erreur lors de la recherche des produits liés: ${error.message}`);
    }
}

// ROUTES POUR CATEGORIES
// GET Categories
app.get('/categories', async (req, res) => {
    try {
        const results = await executeQuery('SELECT * FROM categories');
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Category by ID
app.get('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const results = await executeQuery(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }
        
        res.status(200).json(results[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Categories
app.post('/categories', async (req, res) => {
    try {
        const { nom_categories } = req.body;
        
        if (!nom_categories) {
            return res.status(400).json({ error: 'Le nom de la catégorie est requis' });
        }

        const result = await executeQuery(
            'INSERT INTO categories (nom_categories) VALUES (?)',
            [nom_categories]
        );

        const newCategory = await executeQuery(
            'SELECT * FROM categories WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(newCategory[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT Categories
app.put('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nom_categories } = req.body;

        if (!nom_categories) {
            return res.status(400).json({ error: 'Le nom de la catégorie est requis' });
        }

        await executeQuery(
            'UPDATE categories SET nom_categories = ? WHERE id = ?',
            [nom_categories, id]
        );

        const updatedCategory = await executeQuery(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );

        if (updatedCategory.length === 0) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        res.status(200).json(updatedCategory[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Suppression sécurisée pour Categories
app.delete('/categories/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        const linkedProducts = await getLinkedProducts('categories', 'id_categories', id);

        if (linkedProducts.length > 0) {
            const productNames = linkedProducts.map(p => p.nom_produit).join(', ');
            await connection.rollback();
            return res.status(400).json({ 
                error: `Impossible de supprimer. Produits liés : ${productNames}`,
                linkedProducts: linkedProducts
            });
        }

        const result = await executeQuery(
            'DELETE FROM categories WHERE id = ?',
            [id]
        );

        await connection.commit();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        res.status(200).json({ 
            message: 'Catégorie supprimée avec succès',
            deletedId: id 
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// ROUTES POUR TYPES
// GET Types
app.get('/types', async (req, res) => {
    try {
        const results = await executeQuery('SELECT * FROM types');
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Type by ID
app.get('/types/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const results = await executeQuery(
            'SELECT * FROM types WHERE id = ?',
            [id]
        );
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Type non trouvé' });
        }
        
        res.status(200).json(results[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Types
app.post('/types', async (req, res) => {
    try {
        const { nom_types } = req.body;
        
        if (!nom_types) {
            return res.status(400).json({ error: 'Le nom du type est requis' });
        }

        const result = await executeQuery(
            'INSERT INTO types (nom_types) VALUES (?)',
            [nom_types]
        );

        const newType = await executeQuery(
            'SELECT * FROM types WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(newType[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT Types
app.put('/types/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nom_types } = req.body;

        if (!nom_types) {
            return res.status(400).json({ error: 'Le nom du type est requis' });
        }

        await executeQuery(
            'UPDATE types SET nom_types = ? WHERE id = ?',
            [nom_types, id]
        );

        const updatedType = await executeQuery(
            'SELECT * FROM types WHERE id = ?',
            [id]
        );

        if (updatedType.length === 0) {
            return res.status(404).json({ error: 'Type non trouvé' });
        }

        res.status(200).json(updatedType[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Suppression sécurisée pour Types
app.delete('/types/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        const linkedProducts = await getLinkedProducts('types', 'id_types', id);

        if (linkedProducts.length > 0) {
            const productNames = linkedProducts.map(p => p.nom_produit).join(', ');
            await connection.rollback();
            return res.status(400).json({ 
                error: `Impossible de supprimer. Produits liés : ${productNames}`,
                linkedProducts: linkedProducts
            });
        }

        const result = await executeQuery(
            'DELETE FROM types WHERE id = ?',
            [id]
        );

        await connection.commit();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Type non trouvé' });
        }

        res.status(200).json({ 
            message: 'Type supprimé avec succès',
            deletedId: id 
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// ROUTES POUR PRODUITS
// GET Produits
app.get('/produits', async (req, res) => {
    try {
        const results = await executeQuery(`
            SELECT 
                p.*, 
                c.nom_categories AS nom_categorie, 
                t.nom_types AS nom_type 
            FROM produits p
            LEFT JOIN categories c ON p.id_categories = c.id
            LEFT JOIN types t ON p.id_types = t.id
        `);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Product by ID
app.get('/produits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const results = await executeQuery(`
            SELECT 
                p.*, 
                c.nom_categories AS nom_categorie, 
                t.nom_types AS nom_type 
            FROM produits p
            LEFT JOIN categories c ON p.id_categories = c.id
            LEFT JOIN types t ON p.id_types = t.id
            WHERE p.id = ?
        `, [id]);
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        
        res.status(200).json(results[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Produits
app.post('/produits', async (req, res) => {
    try {
        const { 
            nom_produit, 
            date_expiration, 
            date_creation,  // Ajout de date_creation comme paramètre optionnel
            id_categories, 
            id_types 
        } = req.body;
        
        if (!nom_produit || !date_expiration) {
            return res.status(400).json({ 
                error: 'Nom du produit et date d\'expiration sont requis' 
            });
        }

        const result = await executeQuery(
            'INSERT INTO produits (nom_produit, date_expiration, date_creation, id_categories, id_types) VALUES (?, ?, ?, ?, ?)',
            [nom_produit, date_expiration, date_creation || null, id_categories, id_types]
        );

        const newProduct = await executeQuery(
            `SELECT 
                p.*, 
                c.nom_categories AS nom_categorie, 
                t.nom_types AS nom_type 
            FROM produits p
            LEFT JOIN categories c ON p.id_categories = c.id
            LEFT JOIN types t ON p.id_types = t.id
            WHERE p.id = ?`,
            [result.insertId]
        );

        res.status(201).json(newProduct[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT Produits
app.put('/produits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            nom_produit, 
            date_expiration, 
            date_creation,  
            id_categories, 
            id_types 
        } = req.body;

        let updateQuery = 'UPDATE produits SET ';
        const params = [];

        if (nom_produit) {
            updateQuery += 'nom_produit = ?, ';
            params.push(nom_produit);
        }
        if (date_expiration) {
            updateQuery += 'date_expiration = ?, ';
            params.push(date_expiration);
        }
        if (date_creation !== undefined) {  // Permet de mettre à jour date_creation si fourni
            updateQuery += 'date_creation = ?, ';
            params.push(date_creation);
        }
        if (id_categories !== undefined) {
            updateQuery += 'id_categories = ?, ';
            params.push(id_categories);
        }
        if (id_types !== undefined) {
            updateQuery += 'id_types = ?, ';
            params.push(id_types);
        }

        updateQuery = updateQuery.slice(0, -2) + ' WHERE id = ?';
        params.push(id);

        if (params.length === 1) {
            return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
        }

        await executeQuery(updateQuery, params);

        const updatedProduct = await executeQuery(
            `SELECT 
                p.*, 
                c.nom_categories AS nom_categorie, 
                t.nom_types AS nom_type 
            FROM produits p
            LEFT JOIN categories c ON p.id_categories = c.id
            LEFT JOIN types t ON p.id_types = t.id
            WHERE p.id = ?`,
            [id]
        );

        if (updatedProduct.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        res.status(200).json(updatedProduct[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Suppression des Produits
app.delete('/produits/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        const [productDetails] = await executeQuery(
            'SELECT nom_produit, id_categories, id_types FROM produits WHERE id = ?', 
            [id]
        );

        if (!productDetails) {
            await connection.rollback();
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const result = await executeQuery(
            'DELETE FROM produits WHERE id = ?',
            [id]
        );

        await connection.commit();

        res.status(200).json({ 
            message: 'Produit supprimé avec succès',
            deletedId: id
           
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
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