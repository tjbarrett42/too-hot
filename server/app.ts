require('dotenv').config();

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';

const CLIENT_ID = process.env.CLIENT_ID;
const mongo_pw = process.env.MONGO_URI_PW;

const uri = `mongodb+srv://tjbarrett42:${mongo_pw}@toohotcluster.5w5mkpc.mongodb.net/?retryWrites=true&w=majority`

const port = 3000; // Your desired port
const client = new OAuth2Client(CLIENT_ID); // Replace with your actual client ID

const userSchema = new mongoose.Schema({
    googleId: {
      type: String,
      unique: true,
    }
  });

const User = mongoose.model('User', userSchema);

mongoose.connect(uri)
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.log(err));

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

/* Google Auth Lib connection */
async function verify(token: string) {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID, // client ID of app that accesses backend
    });
    const payload = ticket.getPayload();
    const userId = payload?.sub;  // Google ID
    return userId;
}

app.post('/api/googleSignIn', async (req, res) => {
    const { tokenId } = req.body;
  
    try {
      const googleId = await verify(tokenId);
  
      if (!googleId) {
        return res.status(401).send('Unauthorized');
      }
  
      let user = await User.findOne({ googleId });
  
      if (!user) {
        user = new User({ googleId: googleId });
        await user.save();
      } else {
        // Update user data if needed
      }
  
      res.status(200).send({ user });
  
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
    
  /* TODO: Move elsewhere. preset configuration */

const preferenceSchema = new mongoose.Schema({
    attribute: String,
    maxValue: Number,
    minValue: Number,
    toggleValue: Boolean
})

const presetSchema = new mongoose.Schema({
    userId: String,
    name: String,
    preferences: [preferenceSchema]
});

const Preset = mongoose.model('Preset', presetSchema);
  
  // Create a new preset
app.post('/api/presets', async (req, res) => {
    // Your logic here
    const newPreset = new Preset({
      userId: req.body.userId,
      name: req.body.name,
      // ... other fields
    });
    console.log('saving new preset: ', newPreset);
    await newPreset.save();
    res.status(201).send(newPreset);
});

app.get('/api/presets', async (req, res) => {
    // Read all presets of a user or get single preset, depends on the type of id
    if (req.query.userId) {
        console.log('searching for presets for userID: ', req.query.userId);
      
      const presets = await Preset.find({ userId: req.query.userId });
      res.status(200).send(presets);
    } else if (req.query.presetId) { // Get single preset
        console.log('getting ind preset:', req.query.presetId);
      // Your logic for fetching a single preset
      const preset = await Preset.find({ _id: req.query.presetId });
      res.status(200).send(preset);
    }
  });

// Update a preset
app.put('/api/presets/:presetId', async (req, res) => {
// Your logic here
const preset = await Preset.findByIdAndUpdate(req.params.presetId, { $set: { preferences: req.body.preferences } }, { new: true });
console.log('updating preset ', preset);
res.status(200).send(preset);
});



// Delete a preset
app.delete('/api/presets/:presetId', async (req, res) => {
console.log('deleting preset id: ', req.params.presetId);
await Preset.findByIdAndDelete(req.params.presetId);
res.status(204).send();
});
