// cors
const cors = require("cors");
app.use(cors());

// server.js
const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config(); // Charge les variables d'environnement depuis le fichier .env

const app = express();
const port = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;

// console.log("uri:", uri);

// Route pour renvoyer le leaderboard (avec apparition la plus récente)
app.get("/leaderboard", async (req, res) => {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db("bot-swbox-db"); // Nom de la base
        const collection = db.collection("upload-json"); // Nom de la collection

        // Récupérer les documents
        const data = await collection.find({}).toArray();

        // Fonction pour parser une date au format DD-MM-YYYY en objet Date
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split("-");
            return new Date(`${year}-${month}-${day}`);
        };

        // Pour chaque document, récupérer l'apparition ayant la date la plus récente
        const leaderboard = data.map(doc => {
            const mostRecent = doc.apparitions.reduce((latest, current) =>
                parseDate(current.date) > parseDate(latest.date) ? current : latest
            );
            return {
                id: doc.id,
                date: mostRecent.date,
                pseudo: mostRecent.pseudo,
                score_eff: mostRecent.score_eff,
                score_spd: mostRecent.score_spd,
                total: mostRecent.score_eff + mostRecent.score_spd,
            };
        });

        res.json({ leaderboard });
    } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
        res.status(500).json({ error: "Erreur lors de la connexion à la base de données" });
    } finally {
        await client.close();
    }
});

// Route pour renvoyer tous les éléments d'un document joueur (/playerDetail)
// avec tri des apparitions du plus vieux au plus récent.
app.get("/playerDetail/:id", async (req, res) => {
    const playerId = req.params.id;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db("bot-swbox-db");
        const collection = db.collection("upload-json");

        // Recherche du document correspondant au joueur (champ "id")
        const player = await collection.findOne({ id: playerId });
        if (!player) {
            res.status(404).json({ error: "Joueur non trouvé" });
        } else {
            // Fonction pour parser une date au format DD-MM-YYYY en objet Date
            const parseDate = (dateStr) => {
                const [day, month, year] = dateStr.split("-");
                return new Date(`${year}-${month}-${day}`);
            };
            // Tri des apparitions par date, du plus vieux au plus récent
            player.apparitions.sort((a, b) => {
                return parseDate(a.date) - parseDate(b.date);
            });
            res.json({ player });
        }
    } catch (error) {
        console.error("Erreur lors de la récupération du document :", error);
        res.status(500).json({ error: "Erreur lors de la récupération du document" });
    } finally {
        await client.close();
    }
});

app.listen(port, () => {
    console.log(`Serveur Express démarré sur le port ${port}`);
});
