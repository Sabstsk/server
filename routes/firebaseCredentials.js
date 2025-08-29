const express = require('express');
const router = express.Router();
const FirebaseCredentials = require('../models/FirebaseCredentials');

// Get all Firebase credentials
router.get('/', async (req, res) => {
    try {
        const credentials = await FirebaseCredentials.find().select('-serviceAccount.private_key');
        res.json({
            success: true,
            data: credentials
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching Firebase credentials',
            error: error.message
        });
    }
});

// Add new Firebase credentials
router.post('/', async (req, res) => {
    try {
        const {
            projectId,
            projectName,
            serviceAccount,
            databaseURL
        } = req.body;

        const newCredentials = new FirebaseCredentials({
            projectId,
            projectName,
            serviceAccount,
            databaseURL
        });

        await newCredentials.save();

        res.status(201).json({
            success: true,
            message: 'Firebase credentials added successfully',
            data: {
                projectId: newCredentials.projectId,
                projectName: newCredentials.projectName,
                isActive: newCredentials.isActive
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({
                success: false,
                message: 'Project ID already exists'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error adding Firebase credentials',
                error: error.message
            });
        }
    }
});

// Update Firebase credentials
router.put('/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const updates = req.body;

        const credentials = await FirebaseCredentials.findOneAndUpdate(
            { projectId },
            updates,
            { new: true, runValidators: true }
        ).select('-serviceAccount.private_key');

        if (!credentials) {
            return res.status(404).json({
                success: false,
                message: 'Firebase credentials not found'
            });
        }

        res.json({
            success: true,
            message: 'Firebase credentials updated successfully',
            data: credentials
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating Firebase credentials',
            error: error.message
        });
    }
});

// Delete Firebase credentials
router.delete('/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;

        const credentials = await FirebaseCredentials.findOneAndDelete({ projectId });

        if (!credentials) {
            return res.status(404).json({
                success: false,
                message: 'Firebase credentials not found'
            });
        }

        res.json({
            success: true,
            message: 'Firebase credentials deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting Firebase credentials',
            error: error.message
        });
    }
});

// Toggle active status
router.patch('/:projectId/toggle', async (req, res) => {
    try {
        const { projectId } = req.params;

        const credentials = await FirebaseCredentials.findOne({ projectId });

        if (!credentials) {
            return res.status(404).json({
                success: false,
                message: 'Firebase credentials not found'
            });
        }

        credentials.isActive = !credentials.isActive;
        await credentials.save();

        res.json({
            success: true,
            message: `Firebase credentials ${credentials.isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                projectId: credentials.projectId,
                isActive: credentials.isActive
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error toggling Firebase credentials status',
            error: error.message
        });
    }
});

module.exports = router;
