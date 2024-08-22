import express, { Request, Response } from 'express';
import axios from 'axios';
import config from './config.json';

const app = express();
const port = 3000;

interface ArticleId {
    idtype: string;
    value: string;
}

interface Article {
    uid: string;
    title: string;
    articleids: ArticleId[];
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

app.get('/search', async (req: Request, res: Response) => {
    const query: string = typeof req.query.q === 'string' ? req.query.q : 'genomics';
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
    const email = config.email;  // Replace with your actual email
    const apiKey = config.apiKey;  // Replace with your actual API key

    try {
        const searchUrl = `${baseUrl}/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}[title/abstract]&retmode=json&email=${email}&api_key=${apiKey}`;
        const searchResponse = await axios.get(searchUrl);
        const searchData: SearchData = searchResponse.data;

        if (!searchData.esearchresult.idlist.length) {
            res.status(404).send('No full-text articles found.');
            return;
        }

        const ids = searchData.esearchresult.idlist.join(',');
        const summaryUrl = `${baseUrl}/esummary.fcgi?db=pmc&id=${ids}&retmode=json&email=${email}&api_key=${apiKey}`;
        const summaryResponse = await axios.get(summaryUrl);
        const summaryData: SummaryData = summaryResponse.data;

        // Extracting link and reference information
        const articles = Object.values(summaryData.result).map((article: Article) => {
            // Debugging: log article to see the structure
            console.log(article);
        
            // Check if articleids is defined and is an array
            if (!Array.isArray(article.articleids)) {
                console.log('No articleids found for article with UID:', article.uid);
                return {
                    title: article.title,
                    pmcUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.uid}/`,
                    doiUrl: null // Default to null if articleids is not an array
                };
            }
        
            return {
                title: article.title,
                pmcUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.uid}/`,
                doiUrl: article.articleids.find(id => id.idtype === 'doi')?.value ?? null
            };
        });

        res.json(articles);
        res.send(summaryData);

    } catch (error) {
        console.error('Failed to fetch data from PMC:', error);
        res.status(500).send('Failed to fetch data from PMC');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
