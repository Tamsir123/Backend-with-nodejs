CREATE DATABASE `2ieTP`;

USE `2ieTP`;
CREATE TABLE etudiant (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    age INT,
    date_de_naissance DATE NOT NULL, 
    date_insertion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP -- Use TIMESTAMP for insertion date
);