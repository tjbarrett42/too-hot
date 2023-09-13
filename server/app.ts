import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';

const app = express();
const port = 3000; // Your desired port
const client = new OAuth2Client('YOUR_GOOGLE_CLIENT_ID'); // Replace with your actual client ID

app.use(cors());
app.use(bodyParser.json());

async function verify(token: string) {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: 'YOUR_GOOGLE_CLIENT_ID',
    });
    const payload = ticket.getPayload();
    return payload;
}

// mongoose.connect('mongodb://localhost:27017/mydb', { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => console.log(err));

//   app.post('/verify', async (req, res) => {
//     const token = req.body.token;
//     const payload = await verify(token);
//     if (payload) {
//       res.status(200).send({ userId: payload.sub });
//     } else {
//       res.status(401).send("Unauthorized");
//     }
//   });
  
//   app.post('/savePreset', async (req, res) => {
//     // Your code to save the preset
//     const newPreset = new Preset({
//       userId: req.body.userId,
//       preference: req.body.preference
//     });
//     await newPreset.save();
//     res.status(200).send("Preset saved");
//   });
  
//   app.listen(port, () => {
//     console.log(`Server running on http://localhost:${port}`);
//   });
    
