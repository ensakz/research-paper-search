import express, { Request, Response } from 'express';
import axios from 'axios';
const config = require('./config.json');

const app = express();
const port = 3000;

app.get('/search', async (req: Request, res: Response) => {
    const query: string = typeof req.query.q === 'string' ? req.query.q : 'genomics';
    const sort: string = typeof req.query.sort === 'string' ? req.query.sort : 'relevance';
    const retmax: number = typeof req.query.retmax === 'string' ? parseInt(req.query.retmax) : 20;

    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
    const email = config.email;
    const apiKey = config.apiKey;

    try {
        // Determine sort parameter
        let sortParam = '';
        if (sort === 'date') {
            sortParam = '&sort=pub+date';
        } else if (sort === 'relevance') {
            sortParam = '&sort=relevance';
        }

        // Searching in PMC for full text documents
        const searchUrl = `${baseUrl}/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}[title/abstract]${sortParam}&retmode=json&retmax=${retmax}&email=${email}&api_key=${apiKey}`;
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