import * as functions from 'firebase-functions';
import corsLib from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
// Load local secrets when running in the emulator
if (process.env.FUNCTIONS_EMULATOR) {
    dotenv.config({ path: '.env.local' });
}
const cors = corsLib({ origin: true });
export const aiProxy = functions
    .region('us-central1')
    .runWith({ secrets: ['OPENAI_API_KEY'] })
    .https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            const { prompt, tools } = req.body;
            const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const result = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a canvas assistant. Use function calls to manipulate the canvas.' },
                    { role: 'user', content: prompt },
                ],
                tools,
                tool_choice: 'auto',
            });
            res.json(result);
        }
        catch (e) {
            res.status(500).json({ error: e?.message ?? 'Unknown error' });
        }
    });
});
