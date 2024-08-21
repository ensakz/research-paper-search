import express, { Request, Response } from 'express';
import axios from 'axios';
import config from './config.json';

const app = express();
const port = 3000;

app.get('/search', async (req: Request, res: Response) => {
    // Ensure the query is a string by checking and assigning a default if necessary
    const query: string = typeof req.query.q === 'string' ? req.query.q : 'genomics';

    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
    const email = config.email;  // Replace with your actual email
    const apiKey = config.apiKey;  // Replace with your actual API key

    try {
        // Searching in PMC for full text documents
        const searchUrl = `${baseUrl}/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}[title/abstract]&retmode=json&email=${email}&api_key=${apiKey}`;
        const searchResponse = await axios.get(searchUrl);
        const searchData = searchResponse.data;

        if (!searchData.esearchresult.idlist.length) {
            res.status(404).send('No full-text articles found.');
            return;
        }

        const ids = searchData.esearchresult.idlist.join(',');
        const summaryUrl = `${baseUrl}/efetch.fcgi?db=pmc&id=${ids}&rettype=abstract&retmode=xml&email=${email}&api_key=${apiKey}`;
        const summaryResponse = await axios.get(summaryUrl);
        const summaryData = summaryResponse.data;

        // Sending XML data or converting XML to text/JSON could be handled here
        res.send(summaryData);
    } catch (error) {
        console.error('Failed to fetch data from PMC:', error);
        res.status(500).send('Failed to fetch data from PMC');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
