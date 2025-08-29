const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    originalValue: { type: mongoose.Schema.Types.Mixed, required: true },
    newValue: { type: mongoose.Schema.Types.Mixed, required: true },
    dataId: { type: String, required: true },
    projectId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    // Aage aap userId bhi add kar sakte hain
});

module.exports = mongoose.model('History', historySchema);