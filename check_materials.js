const mongoose = require('mongoose');
require('dotenv').config({ path: 'website_backend/.env' });
const ClassMaterial = require('./website_backend/src/models/ClassMaterial');

async function checkMaterials() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const materials = await ClassMaterial.find({}).lean();
        console.log(JSON.stringify(materials, null, 2));
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkMaterials();
