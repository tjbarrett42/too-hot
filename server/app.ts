import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';

const CLIENT_ID = '283648574519-dtuo7hds214qmtr77d5egm6v76dundco.apps.googleusercontent.com';

const uri = "mongodb+srv://tjbarrett42:lsVlzvE835DLQI3O@toohotcluster.5w5mkpc.mongodb.net/?retryWrites=true&w=majority";

const port = 3000; // Your desired port
const client = new OAuth2Client(CLIENT_ID); // Replace with your actual client ID

const userSchema = new mongoose.Schema({
    googleId: {
      type: String,
      unique: true,
    },
    preferences: {
      type: Object,
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
    console.log(payload)
    return userId;
}

app.post('/api/googleSignIn', async (req, res) => {
    console.log("Received token: ", req.body.token); 
    const { tokenId } = req.body;
  
    try {
      const googleId = await verify(tokenId);
  
      if (!googleId) {
        return res.status(401).send('Unauthorized');
      }
  
      let user = await User.findOne({ googleId });
  
      if (!user) {
        user = new User({ googleId });
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

  const presetSchema = new mongoose.Schema({
    userId: String,
    name: String,
    // ... other preset fields
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
    await newPreset.save();
    res.status(201).send(newPreset);
  });
  
  // Read all presets of a user
  app.get('/api/presets/:userId', async (req, res) => {
    // Your logic here
    const presets = await Preset.find({ userId: req.params.userId });
    res.status(200).send(presets);
  });
  
  // Update a preset
  app.put('/api/presets/:presetId', async (req, res) => {
    // Your logic here
    const preset = await Preset.findByIdAndUpdate(req.params.presetId, req.body, { new: true });
    res.status(200).send(preset);
  });
  
  // Delete a preset
  app.delete('/api/presets/:presetId', async (req, res) => {
    // Your logic here
    await Preset.findByIdAndDelete(req.params.presetId);
    res.status(204).send();
  });
  