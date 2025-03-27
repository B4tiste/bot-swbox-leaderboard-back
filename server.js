// server.js
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors"); // Require the cors package
require("dotenv").config(); // Load environment variables from .env

const app = express();
const port = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;

app.use(cors()); // Enable CORS for all routes

// Route to return the leaderboard (with the most recent appearance)
app.get("/leaderboard", async (req, res) => {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db("bot-swbox-db"); // Database name
        const collection = db.collection("upload-json"); // Collection name

        // Retrieve documents
        const data = await collection.find({}).toArray();

        // Function to parse a date in DD-MM-YYYY format to a Date object
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split("-");
            return new Date(`${year}-${month}-${day}`);
        };

        // For each document, retrieve the appearance with the most recent date
        const leaderboard = data.map(doc => {
            const mostRecent = doc.apparitions.reduce((latest, current) =>
                parseDate(current.date) > parseDate(latest.date) ? current : latest
            );
            return {
                id: doc.id,
                date: mostRecent.date,
                pseudo: mostRecent.pseudo,
                score_rta_eff: mostRecent.rta_eff,
                score_siege_eff: mostRecent.siege_eff,
                score_rta_spd: mostRecent.rta_spd,
                score_siege_spd: mostRecent.siege_spd,
                anonyme: mostRecent.anonyme,
                apparitionsCount: doc.apparitions.length
            };
        });

        res.json({ leaderboard });
    } catch (error) {
        console.error("Error retrieving data:", error);
        res.status(500).json({ error: "Error connecting to the database" });
    } finally {
        await client.close();
    }
});

// Route to return all elements of a player document (/playerDetail)
// with the appearances sorted from oldest to most recent.
app.get("/playerDetail/:id", async (req, res) => {
    const playerId = req.params.id;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db("bot-swbox-db");
        const collection = db.collection("upload-json");

        // Find the document corresponding to the player (field "id")
        const player = await collection.findOne({ id: playerId });
        if (!player) {
            return res.status(404).json({ error: "Player not found" });
        }

        // Check if any apparition is anonymous
        const hasAnonymous = player.apparitions?.some(app => app.anonyme === 1);
        if (hasAnonymous) {
            return res.status(401).json({ error: "Unauthorized: anonymous appearance" });
        }

        // Function to parse a date in DD-MM-YYYY format to a Date object
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split("-");
            return new Date(`${year}-${month}-${day}`);
        };

        // Sort appearances by date, from oldest to most recent
        player.apparitions.sort((a, b) => parseDate(a.date) - parseDate(b.date));

        res.json({ player });
    } catch (error) {
        console.error("Error retrieving the document:", error);
        res.status(500).json({ error: "Error retrieving the document" });
    } finally {
        await client.close();
    }
});


app.listen(port, () => {
    console.log(`Express server started on port ${port}`);
});
