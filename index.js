const express = require("express");
var bodyParser  = require("body-parser");
const app = express();


// Définir un port
const PORT = 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Route de base
app.get("/", (req, res) => {
  res.send("Bienvenue sur mon API !");
});

// Lancer le serveur
app.listen(PORT, () => {
  console.log('Serveur démarré sur http://localhost:${PORT}');
});

let users = [
  { id: 1, name: "Zongo" },
  { id: 2, name: "Kabore" }
];

// Lire tous les utilisateurs
app.get("/users", (req, res) => {
  res.send(users);
});

// Lire un utilisateur par ID
app.get("/users/:id", (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.send("Utilisateur non trouvé");
  res.json(user);
});

// Ajouter un utilisateur
app.post("/users", (req, res) => {
  const newUser = { id: users.length + 1, name: req.body.name };
  users.push(newUser);
  res.send(newUser);
});

// Mettre à jour un utilisateur
app.put("/users/:id", (req, res) => {
  let user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.send("Utilisateur non trouvé");
  user.name = req.body.name;
  res.json(user);
});

//  Supprimer un utilisateur
app.delete("/users/:id", (req, res) => {
  users = users.filter(u => u.id !== parseInt(req.params.id));
  res.send("Utilisateur supprimé");
});