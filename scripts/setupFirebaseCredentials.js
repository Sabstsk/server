const mongoose = require('mongoose');
const FirebaseCredentials = require('../models/FirebaseCredentials');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase';

async function setupFirebaseCredentials() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Example Firebase credentials - Replace with your actual credentials
        const firebaseCredentials = [
            {
                projectId: 'cust3-9edaf',
                projectName: 'Customer Project 3',
                serviceAccount: {
                    type: 'service_account',
                    project_id: 'cust3-9edaf',
                    private_key_id: 'your-private-key-id',
                    private_key: '-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----',
                    client_email: 'firebase-adminsdk-fbsvc@cust3-9edaf.iam.gserviceaccount.com',
                    client_id: 'your-client-id',
                    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
                    token_uri: 'https://oauth2.googleapis.com/token',
                    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
                    client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40cust3-9edaf.iam.gserviceaccount.com'
                },
                databaseURL: 'https://cust3-9edaf-default-rtdb.firebaseio.com',
                isActive: true
            },
            {
                projectId: 'cust4-523c2',
                projectName: 'Customer Project 4',
                serviceAccount: {
                    type: 'service_account',
                    project_id: 'cust4-523c2',
                    private_key_id: 'your-private-key-id-2',
                    private_key: '-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE_2\n-----END PRIVATE KEY-----',
                    client_email: 'firebase-adminsdk-fbsvc@cust4-523c2.iam.gserviceaccount.com',
                    client_id: 'your-client-id-2',
                    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
                    token_uri: 'https://oauth2.googleapis.com/token',
                    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
                    client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40cust4-523c2.iam.gserviceaccount.com'
                },
                databaseURL: 'https://cust4-523c2-default-rtdb.firebaseio.com',
                isActive: true
            }
        ];

        // Clear existing credentials
        await FirebaseCredentials.deleteMany({});
        console.log('🗑️ Cleared existing Firebase credentials');

        // Insert new credentials
        for (const cred of firebaseCredentials) {
            const newCred = new FirebaseCredentials(cred);
            await newCred.save();
            console.log(`✅ Added Firebase credentials for project: ${cred.projectId}`);
        }

        console.log('🎉 Firebase credentials setup completed!');
        
    } catch (error) {
        console.error('❌ Error setting up Firebase credentials:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Run the setup
if (require.main === module) {
    setupFirebaseCredentials();
}

module.exports = setupFirebaseCredentials;
