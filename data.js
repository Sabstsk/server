const express = require('express');
const router = express.Router();
const History = require('./models/History');
const path = require('path');

// Helper function to get the Firebase apps object from the server
const getFirebaseApps = (req) => req.app.get('firebaseApps');

// Helper function to determine the Firebase path based on data type
const getRefPath = (dataType, dataId) => {
    if (dataType === 'Cow') {
        return `Cow/${dataId}`;
    }
    if (dataType === 'Milk') {
        return `Milk/${dataId}`;
    }
    return null;
};

// /api/data/all API: Fetches all data from all projects
router.get('/all', async (req, res) => {
    try {
        const firebaseApps = getFirebaseApps(req);
        const allData = [];
        const projectPromises = [];

        // Iterate over each Firebase project to fetch data
        for (const projectId in firebaseApps) {
            const app = firebaseApps[projectId];
            const db = app.database();
            const cowPromise = db.ref('Cow').once('value');
            const milkPromise = db.ref('Milk').once('value');

            projectPromises.push(
                Promise.all([cowPromise, milkPromise]).then(([cowSnapshot, milkSnapshot]) => {
                    const projectData = [];
                    if (cowSnapshot.exists()) {
                        cowSnapshot.forEach(childSnapshot => {
                            projectData.push({ sourceProjectId: projectId, dataType: 'Cow', id: childSnapshot.key, data: childSnapshot.val() });
                        });
                    }
                    if (milkSnapshot.exists()) {
                        milkSnapshot.forEach(childSnapshot => {
                            projectData.push({ sourceProjectId: projectId, dataType: 'Milk', id: childSnapshot.key, data: childSnapshot.val() });
                        });
                    }
                    return projectData;
                })
            );
        }

        const results = await Promise.all(projectPromises);
        results.forEach(projectData => {
            allData.push(...projectData);
        });

        console.log('✅ Successfully fetched all data from all projects.');
        res.status(200).json(allData);
    } catch (error) {
        console.error('❌ Error fetching data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// /api/data/modify API: Updates a single entry
router.post('/modify', async (req, res) => {
    try {
        const { projectId, dataId, newData, dataType } = req.body;
        let determinedDataType = dataType;

        // Backward compatibility: Determine data type from data content if not explicitly provided
        if (!determinedDataType) {
            if (newData.mobile) {
                determinedDataType = 'Cow';
            } else if (newData.mobileNumber) {
                determinedDataType = 'Milk';
            } else {
                return res.status(400).json({ message: 'Cannot determine data type. Please include "dataType", "mobile", or "mobileNumber" in the request body.' });
            }
        }
        
        const refPath = getRefPath(determinedDataType, dataId);
        if (!refPath) {
             return res.status(400).json({ message: 'Invalid data type.' });
        }

        if (!projectId || !dataId || !newData) {
            return res.status(400).json({ message: 'Missing required fields: projectId, dataId, and newData' });
        }

        const firebaseApps = getFirebaseApps(req);
        const app = firebaseApps[projectId];
        if (!app) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const db = app.database();
        const ref = db.ref(refPath);
        const originalSnapshot = await ref.once('value');
        const originalData = originalSnapshot.val();

        if (!originalSnapshot.exists()) {
            return res.status(404).json({ message: 'Data entry not found.' });
        }
        
        // Save history entry
        const historyEntry = new History({
            originalValue: originalData,
            newValue: newData,
            dataId: dataId,
            projectId: projectId,
            dataType: determinedDataType,
        });
        await historyEntry.save();
        
        // Update the data in Firebase
        await ref.update(newData);
        
        console.log(`✅ Successfully modified data in project ${projectId} for dataId ${dataId}.`);
        res.status(200).json({ message: 'Data updated successfully' });
    } catch (error) {
        console.error('❌ Error modifying data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// /api/data/update-all-forward: Updates the forward number in all projects
router.post('/update-all-forward', async (req, res) => {
    try {
        const { newForwardNumber } = req.body;
        if (!newForwardNumber) {
            return res.status(400).json({ message: 'Missing required field: newForwardNumber' });
        }

        const firebaseApps = getFirebaseApps(req);
        const updatePromises = [];
        for (const projectId in firebaseApps) {
            const app = firebaseApps[projectId];
            const db = app.database();
            const cowPromise = db.ref('Cow').update({ forward: newForwardNumber });
            const milkPromise = db.ref('Milk').update({ forward: newForwardNumber });
            updatePromises.push(cowPromise, milkPromise);
        }

        await Promise.all(updatePromises);
        console.log('✅ Successfully updated forward number in all projects.');
        res.status(200).json({ message: 'Forward number updated successfully in all projects' });
    } catch (error) {
        console.error('❌ Error updating all forward numbers:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// /api/data/undo API: Reverts the latest change
router.post('/undo', async (req, res) => {
    try {
        // Find the latest history entry
        const latestEntry = await History.findOne().sort({ timestamp: -1 });
        if (!latestEntry) {
            return res.status(404).json({ message: 'No history found to undo.' });
        }

        const { projectId, dataId, originalValue, dataType } = latestEntry;
        const app = getFirebaseApps(req)[projectId];
        if (!app) {
            return res.status(404).json({ message: 'Project not found for undo.' });
        }
        
        const refPath = getRefPath(dataType, dataId);
        if (!refPath) {
             return res.status(400).json({ message: 'Could not determine data type from history.' });
        }

        const db = app.database();
        const ref = db.ref(refPath);

        // Revert the data in Firebase
        await ref.set(originalValue);
        
        // Delete the history entry after successful undo
        await History.deleteOne({ _id: latestEntry._id });

        console.log(`✅ Undo successful. Data reverted for projectId ${projectId}, dataId ${dataId}.`);
        res.status(200).json({ message: 'Undo successful. Data reverted to previous state.' });
    } catch (error) {
        console.error('❌ Error performing undo:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
