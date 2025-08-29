const mongoose = require('mongoose');
const crypto = require('crypto');

// Encryption key - in production, use environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here';
const ALGORITHM = 'aes-256-cbc';

// Encryption function
function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

// Decryption function
function decrypt(text) {
    if (!text) return null;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

const firebaseCredentialsSchema = new mongoose.Schema({
    projectId: {
        type: String,
        required: true,
        unique: true
    },
    projectName: {
        type: String,
        required: true
    },
    serviceAccount: {
        type: {
            type: String,
            default: 'service_account'
        },
        project_id: String,
        private_key_id: String,
        private_key: String, // This will be encrypted
        client_email: String,
        client_id: String,
        auth_uri: {
            type: String,
            default: 'https://accounts.google.com/o/oauth2/auth'
        },
        token_uri: {
            type: String,
            default: 'https://oauth2.googleapis.com/token'
        },
        auth_provider_x509_cert_url: {
            type: String,
            default: 'https://www.googleapis.com/oauth2/v1/certs'
        },
        client_x509_cert_url: String
    },
    databaseURL: String,
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save middleware to encrypt sensitive data
firebaseCredentialsSchema.pre('save', function(next) {
    if (this.isModified('serviceAccount.private_key')) {
        this.serviceAccount.private_key = encrypt(this.serviceAccount.private_key);
    }
    this.updatedAt = new Date();
    next();
});

// Method to get decrypted service account
firebaseCredentialsSchema.methods.getDecryptedServiceAccount = function() {
    const serviceAccount = this.serviceAccount.toObject();
    if (serviceAccount.private_key) {
        serviceAccount.private_key = decrypt(serviceAccount.private_key);
    }
    return serviceAccount;
};

// Static method to find active credentials
firebaseCredentialsSchema.statics.findActive = function() {
    return this.find({ isActive: true });
};

module.exports = mongoose.model('FirebaseCredentials', firebaseCredentialsSchema);
