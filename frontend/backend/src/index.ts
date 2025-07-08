import express from 'express';
const app = express();
const PORT = process.env.PORT || 4000;
app.get('/', (req, res) => res.send('Commute Connect API running!'));
app.listen(PORT, () => console.log());
