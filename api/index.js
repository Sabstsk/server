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

// Firebase initialization from MongoDB
let firebaseApps = {};
async function initializeFirebase() {
    if (Object.keys(firebaseApps).length > 0) {
        return firebaseApps;
    }
    
    try {
        // Import Firebase credentials model
        const FirebaseCredentials = require('../models/FirebaseCredentials');
        
        // Fetch active Firebase credentials from MongoDB
        const credentials = await FirebaseCredentials.findActive();
        
        if (credentials && credentials.length > 0) {
            for (const cred of credentials) {
                const serviceAccount = cred.getDecryptedServiceAccount();
                const appName = cred.projectId;
                
                if (!admin.apps.find(app => app.name === appName)) {
                    firebaseApps[appName] = admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                        databaseURL: cred.databaseURL || `https://${cred.projectId}-default-rtdb.firebaseio.com`
                    }, appName);
                    console.log(`✅ Firebase app '${appName}' initialized from MongoDB.`);
                }
            }
        } else {
            console.log('⚠️ No Firebase credentials found in MongoDB.');
        }
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
        const apps = await initializeFirebase();
        req.firebaseApps = apps;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed' });
    }
}, require('../data'));

// Firebase credentials management routes
app.use('/api/firebase-credentials', async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed' });
    }
}, require('../routes/firebaseCredentials'));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

module.exports = app;
