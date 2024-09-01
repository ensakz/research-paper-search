import express, { Request, Response } from 'express';
import axios from 'axios';
import config from './config.json';
import gemini from "./gemini"
import run from './gemini';
import test from 'node:test';
import { text } from 'stream/consumers';

const app = express();
const port = 3000;

interface ArticleSummary {
    [key: string]: string | object;  // More specific typing can be applied based on the expected structure
}

let geminiResponse: Promise<string> | null = null

app.get('/gemini', (req, res) => {
    try{
        const userQuery = req.query.q ? req.query.q.toString() : '';
        const geminiResponse = run(userQuery);
        geminiResponse.then((text)=> {res.send(text);});
    }
    catch(err) {
        console.error("Error in Gemini task:", err);
        res.status(500).send("An error occurred on the server.");
    }});

app.get('/search', async (req: Request, res: Response) => {
    const query: string = req.query.q ? req.query.q.toString() : 'genomics';
    const sort: string = typeof req.query.sort === 'string' ? req.query.sort : 'relevance';
    const retmax: number = typeof req.query.retmax === 'string' ? parseInt(req.query.retmax) : 20;

    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
    const email = config.email;
    const apiKey = config.apiKey;

    const articleSummaries: ArticleSummary = {};
    //const ids = ['PMC11343250', 'PMC1790863'];

    // Determine sort parameter
    let sortParam = '';
    if (sort === 'date') {
        sortParam = '&sort=pub+date';
    } else if (sort === 'relevance') {
        sortParam = '&sort=relevance';
    }

    let searchData;

    try{
    // Searching in PMC for full text documents
    if (geminiResponse) {
        const geminiKeyWords = await geminiResponse;
    const searchUrl = `${baseUrl}/esearch.fcgi?db=pmc&term=${encodeURIComponent(geminiKeyWords)}[title/abstract]${sortParam}&retmode=json&retmax=${retmax}&email=${email}&api_key=${apiKey}`;
    const searchResponse = await axios.get(searchUrl);
    searchData = searchResponse.data;
    if (!searchData.esearchresult.idlist.length) {
        res.status(404).send('No full-text articles found.');
        return;} else {
            res.status(400).send('No query processed by Gemini yet. Make a request to /gemini first.');
        }
    }} catch (error) {
        console.error('Failed to retrieve ids from esearch:', error);
        res.status(500).send('Failed to retrieve ids from esearch');
    }

    const ids = searchData.esearchresult.idlist

    try {
        for (const id of ids) {
            const summaryUrl = `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC${id}/ascii`;
            try {
                const summaryResponse = await axios.get(summaryUrl);
                articleSummaries[id] = summaryResponse.data;  // Store each summary indexed by ID
            } catch (error) {
                console.error(`Failed to fetch summary for ID ${id}:`, error);
                articleSummaries[id] = { error: 'Failed to fetch summary' };  // Handle and store errors
            }
        }
        res.send(articleSummaries)
        //res.send(articleSummaries['11343250']);  // Send all collected summaries as a JSON response
    } catch (error) {
        console.error('Failed to fetch data from PMC:', error);
        res.status(500).send('Failed to fetch data from PMC');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
