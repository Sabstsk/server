const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase';

app.use(express.json());

// MongoDB connection
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB error:', err));

// Firebase Admin SDK ko initialize karein
const configPath = path.join(__dirname, 'config.json');
const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const firebaseApps = {};
configData.firebaseProjects.forEach(project => {
    const serviceAccount = require(path.join(__dirname, project.keyPath));
    const appName = project.id;
    firebaseApps[appName] = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${project.id}-default-rtdb.firebaseio.com`
    }, appName);
    console.log(`✅ Firebase app '${appName}' initialized.`);
});

// Firebase apps object ko app instance mein store karein taaki routes mein access kiya ja sake
app.set('firebaseApps', firebaseApps);

// Data-related routes ko import karein
const dataRoutes = require('./data');
app.use('/api/data', dataRoutes);

app.get('/', (req, res) => {
    res.send('Server is running!');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
