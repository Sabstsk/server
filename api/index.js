const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());

// MongoDB connection
let cachedDb = null;
async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase';
    
    try {
        const connection = await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false,
            bufferMaxEntries: 0,
            useFindAndModify: false,
            useCreateIndex: true
        });
        
        cachedDb = connection;
        console.log('✅ MongoDB connected');
        return connection;
    } catch (error) {
        console.error('❌ MongoDB error:', error);
        throw error;
    }
}

// Firebase initialization
let firebaseApps = {};
function initializeFirebase() {
    if (Object.keys(firebaseApps).length > 0) {
        return firebaseApps;
    }
    
    try {
        const configPath = path.join(__dirname, '../config.json');
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        configData.firebaseProjects.forEach(project => {
            const serviceAccount = require(path.join(__dirname, '../', project.keyPath));
            const appName = project.id;
            
            if (!admin.apps.find(app => app.name === appName)) {
                firebaseApps[appName] = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: `https://${project.id}-default-rtdb.firebaseio.com`
                }, appName);
                console.log(`✅ Firebase app '${appName}' initialized.`);
            }
        });
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
    }
    
    return firebaseApps;
}

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Server is running on Vercel!' });
});

// Data routes
app.use('/api/data', async (req, res, next) => {
    try {
        await connectToDatabase();
        const apps = initializeFirebase();
        req.firebaseApps = apps;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed' });
    }
}, require('../data'));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

module.exports = app;
