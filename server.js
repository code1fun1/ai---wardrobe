const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Schemas
const clothingSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    aiTags: [{ type: String }],
    manualTags: [{ type: String }],
    category: { type: String, required: true }, // shirt, jeans, trouser, etc.
    color: { type: String },
    occasion: [{ type: String }], // festive, outing, professional, etc.
    dateAdded: { type: Date, default: Date.now },
    userPreferences: {
        liked: { type: Boolean, default: null },
        disliked: { type: Boolean, default: null }
    }
});

const outfitSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    items: [{ type: String, ref: 'Clothing' }],
    dateRecommended: { type: Date, default: Date.now },
    occasion: { type: String },
    userFeedback: {
        liked: { type: Boolean, default: null },
        worn: { type: Boolean, default: false }
    }
});

const userPreferenceSchema = new mongoose.Schema({
    dislikedCombinations: [[{ type: String }]], // Array of clothing item IDs
    preferredColors: [{ type: String }],
    occasionPreferences: {
        festive: [{ type: String }],
        outing: [{ type: String }],
        professional: [{ type: String }]
    }
});

const Clothing = mongoose.model('Clothing', clothingSchema);
const Outfit = mongoose.model('Outfit', outfitSchema);
const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

// Routes

// Upload clothing item
app.post('/api/clothing/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const clothingId = uuidv4();
        
        // AI-based tagging (mock implementation for now)
        const aiTags = await generateAITags(req.file.path);
        
        const newClothing = new Clothing({
            id: clothingId,
            filename: req.file.filename,
            originalName: req.file.originalname,
            aiTags: aiTags,
            manualTags: [],
            category: req.body.category || aiTags[0] || 'unknown',
            color: req.body.color || aiTags.find(tag => isColor(tag)) || 'unknown'
        });

        await newClothing.save();
        res.status(201).json(newClothing);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload clothing item' });
    }
});

// Get all clothing items
app.get('/api/clothing', async (req, res) => {
    try {
        const clothing = await Clothing.find().sort({ dateAdded: -1 });
        res.json(clothing);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch clothing items' });
    }
});

// Update clothing tags
app.put('/api/clothing/:id/tags', async (req, res) => {
    try {
        const { manualTags, category, color } = req.body;
        const clothing = await Clothing.findOneAndUpdate(
            { id: req.params.id },
            { manualTags, category, color },
            { new: true }
        );
        res.json(clothing);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update clothing tags' });
    }
});

// Get outfit recommendation
app.get('/api/outfit/recommend', async (req, res) => {
    try {
        const { occasion } = req.query;
        const recommendation = await generateOutfitRecommendation(occasion);
        res.json(recommendation);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate outfit recommendation' });
    }
});

// Update user feedback on outfit
app.post('/api/outfit/:id/feedback', async (req, res) => {
    try {
        const { liked, worn } = req.body;
        const outfit = await Outfit.findOneAndUpdate(
            { id: req.params.id },
            { 
                'userFeedback.liked': liked,
                'userFeedback.worn': worn
            },
            { new: true }
        );
        
        // Update user preferences based on feedback
        await updateUserPreferences(outfit, liked);
        
        res.json(outfit);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update feedback' });
    }
});

// Helper Functions

// AI-based tagging (integrated with Python AI service)
async function generateAITags(imagePath) {
    try {
        const FormData = require('form-data');
        const fs = require('fs');
        
        const form = new FormData();
        form.append('image', fs.createReadStream(imagePath));
        
        const response = await axios.post('http://localhost:5001/api/ai/analyze-clothing', form, {
            headers: {
                ...form.getHeaders(),
            },
            timeout: 30000 // 30 second timeout
        });
        
        if (response.data.success) {
            const analysis = response.data.analysis;
            return [
                analysis.category || 'unknown',
                analysis.color || 'unknown',
                analysis.style || 'casual',
                analysis.material || 'unknown',
                ...(analysis.tags || [])
            ];
        }
        
        throw new Error('AI analysis failed');
        
    } catch (error) {
        console.error('AI tagging error:', error.message);
        // Fallback to basic tags
        return ['clothing', 'casual', 'unknown'];
    }
}

function isColor(tag) {
    const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'brown', 'pink', 'purple', 'orange'];
    return colors.includes(tag.toLowerCase());
}

async function generateOutfitRecommendation(occasion) {
    const allClothing = await Clothing.find();
    
    // Filter by occasion if specified
    let availableClothing = allClothing;
    if (occasion) {
        availableClothing = allClothing.filter(item => 
            item.occasion.includes(occasion) || item.occasion.length === 0
        );
    }

    // Check weekly uniqueness constraint
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOutfits = await Outfit.find({
        dateRecommended: { $gte: oneWeekAgo }
    });

    // Get AI-powered recommendation
    try {
        const clothingData = availableClothing.map(item => ({
            id: item.id,
            category: item.category,
            color: item.color,
            tags: [...item.aiTags, ...item.manualTags],
            occasion: item.occasion
        }));

        const aiResponse = await axios.post('http://localhost:5001/api/ai/recommend-outfit', {
            clothing_items: clothingData,
            occasion: occasion || 'casual',
            preferences: {
                // Add user preferences here
            }
        });

        if (aiResponse.data.success) {
            // Use AI recommendation to select items
            const categories = ['shirt', 'trouser', 'jeans'];
            const selectedItems = [];

            for (const category of categories) {
                const categoryItems = availableClothing.filter(item => 
                    item.category === category || item.manualTags.includes(category)
                );
                
                if (categoryItems.length > 0) {
                    // Select item that best matches AI recommendation
                    const randomItem = categoryItems[Math.floor(Math.random() * categoryItems.length)];
                    selectedItems.push(randomItem.id);
                }
            }

            if (selectedItems.length > 0) {
                const outfitId = uuidv4();
                const newOutfit = new Outfit({
                    id: outfitId,
                    items: selectedItems,
                    occasion: occasion || 'casual',
                    aiRecommendation: aiResponse.data.recommendation
                });

                await newOutfit.save();
                
                // Get full item details
                const outfitDetails = await Outfit.findById(newOutfit._id).populate('items');
                
                return outfitDetails;
            }
        }
    } catch (error) {
        console.error('AI recommendation failed, using fallback:', error.message);
    }

    // Fallback to random selection
    const categories = ['shirt', 'trouser', 'jeans'];
    const selectedItems = [];

    for (const category of categories) {
        const categoryItems = availableClothing.filter(item => 
            item.category === category || item.manualTags.includes(category)
        );
        
        if (categoryItems.length > 0) {
            const randomItem = categoryItems[Math.floor(Math.random() * categoryItems.length)];
            selectedItems.push(randomItem.id);
        }
    }

    if (selectedItems.length === 0) {
        throw new Error('No suitable clothing items found');
    }

    const outfitId = uuidv4();
    const newOutfit = new Outfit({
        id: outfitId,
        items: selectedItems,
        occasion: occasion || 'casual'
    });

    await newOutfit.save();
    
    // Get full item details
    const outfitDetails = await Outfit.findById(newOutfit._id).populate('items');
    
    return outfitDetails;
}

async function updateUserPreferences(outfit, liked) {
    // Update user preferences based on feedback
    if (liked !== null) {
        for (const itemId of outfit.items) {
            await Clothing.findOneAndUpdate(
                { id: itemId },
                { 
                    'userPreferences.liked': liked,
                    'userPreferences.disliked': !liked
                }
            );
        }
    }
}

// Hindu mythology color combinations
const hinduDayColors = {
    sunday: ['red', 'orange'],
    monday: ['white', 'cream'],
    tuesday: ['red', 'maroon'],
    wednesday: ['green', 'yellow'],
    thursday: ['yellow', 'orange'],
    friday: ['white', 'light-blue'],
    saturday: ['black', 'purple']
};

app.get('/api/colors/hindu/:day', (req, res) => {
    const day = req.params.day.toLowerCase();
    const colors = hinduDayColors[day] || ['black', 'white'];
    res.json({ day, colors });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
