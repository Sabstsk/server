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
        // Use environment variables for Firebase credentials in production
        if (process.env.NODE_ENV === 'production') {
            // Initialize Firebase using environment variables
            const serviceAccount = {
                type: "service_account",
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: "https://accounts.google.com/o/oauth2/auth",
                token_uri: "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
            };
            
            const appName = process.env.FIREBASE_PROJECT_ID;
            if (!admin.apps.find(app => app.name === appName)) {
                firebaseApps[appName] = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
                }, appName);
                console.log(`✅ Firebase app '${appName}' initialized from environment variables.`);
            }
        } else {
            // Development: use local config files
            const configPath = path.join(__dirname, '../config.json');
            if (fs.existsSync(configPath)) {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                
                configData.firebaseProjects.forEach(project => {
                    const keyPath = path.join(__dirname, '../', project.keyPath);
                    if (fs.existsSync(keyPath)) {
                        const serviceAccount = require(keyPath);
                        const appName = project.id;
                        
                        if (!admin.apps.find(app => app.name === appName)) {
                            firebaseApps[appName] = admin.initializeApp({
                                credential: admin.credential.cert(serviceAccount),
                                databaseURL: `https://${project.id}-default-rtdb.firebaseio.com`
                            }, appName);
                            console.log(`✅ Firebase app '${appName}' initialized from local config.`);
                        }
                    }
                });
            }
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
