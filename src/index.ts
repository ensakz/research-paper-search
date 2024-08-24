// Import necessary libraries
import express, { Request, Response } from 'express';
import axios from 'axios';
import xml2js from 'xml2js';
import config from './config.json';

// Initialize the express application
const app = express();
const port = 3000;
const parser = new xml2js.Parser({ explicitArray: false });

interface ArticleId {
    idtype: string;
    value: string;
}

interface Article {
    uid: string;
    title: string;
    articleids: ArticleId[];
    fullText: string;
}

interface SummaryData {
    result: {
        [key: string]: Article;
    };
}

interface SearchData {
    esearchresult: {
        idlist: string[];
    };
}

// Update these interfaces to better match the PubMed XML structure:
interface MedlineCitation {
    PMID: string;
    Article: {
        ArticleTitle: string;
        Abstract?: {
            AbstractText: string | string[];
        };
    };
}

interface PubmedArticle {
    MedlineCitation: MedlineCitation;
}

interface PubmedArticleSet {
    PubmedArticle: PubmedArticle | PubmedArticle[];
}

// Add this new interface for the structured response:
interface StructuredArticle {
    id: string;
    title: string;
    abstract: string;
}


app.get('/search', async (req: Request, res: Response) => {
    const query: string = typeof req.query.q === 'string' ? req.query.q : 'genomics';
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
    const email = config.email;
    const apiKey = config.apiKey;

    try {
        // Search for articles by query and retrieve IDs
        const searchUrl = `${baseUrl}/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}&retmode=json&email=${email}&api_key=${apiKey}`;
        const searchResponse = await axios.get<SearchData>(searchUrl);
        const ids = searchResponse.data.esearchresult.idlist;

        if (ids.length === 0) {
            return res.status(404).send('No articles found.');
        }

        // Fetch the details of articles using efetch
        const fetchUrl = `${baseUrl}/efetch.fcgi?db=pmc&id=${ids.join(',')}&retmode=xml&email=${email}&api_key=${apiKey}`;
        const fetchResponse = await axios.get(fetchUrl);
        
        const fetchResult = await parser.parseStringPromise(fetchResponse.data);

        // Map articles to a structured response
        const articles = fetchResult.PubmedArticleSet.PubmedArticle.map((article: PubmedArticle) => {
            return {
                id: article.MedlineCitation.PMID,
                title: article.MedlineCitation.Article.ArticleTitle || 'No title available',
                abstract: article.MedlineCitation.Article.Abstract?.AbstractText || 'No abstract available'
            };
        });

        res.json(articles);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
    }
});
// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
