import express, { Request, Response } from 'express';
import axios from 'axios';
import config from './config.json';
import run, {summarizeArticles} from './gemini';
import { parseStringPromise } from 'xml2js';

const app = express();
const port = 3000;

interface ArticleSummary {
    [key: string]: string | object;
}

async function fetchGeminiKeywords(userQuery: string): Promise<string> {
    try {
        return await run(userQuery);
    } catch (error) {
        console.error("Failed to generate keywords:", error);
        throw new Error("Failed to process query with Gemini.");
    }
}

async function searchNCBI(geminiKeywords: string): Promise<any> {
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
    const email = config.email;
    const apiKey = config.apiKey;
    const sort = 'relevance';
    const retmax = 20;

    const searchUrl = `${baseUrl}/esearch.fcgi?db=pmc&term=${encodeURIComponent(geminiKeywords)}+AND+free+full+text[filter]&sort=${sort}&retmode=json&retmax=${retmax}&email=${email}&api_key=${apiKey}`;
    console.log(searchUrl);

    try {
        const response = await axios.get(searchUrl);
        return response.data;
    } catch (error) {
        console.error('Failed to retrieve data from NCBI:', error);
        throw new Error('Failed to retrieve data from NCBI.');
    }
}

async function fetchArticleSummaries(ids: string[]): Promise<ArticleSummary> {
    const articleSummaries: ArticleSummary = {};

    for (const id of ids) {
        const summaryUrl = `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC${id}/ascii`;
        try {
            const summaryResponse = await axios.get(summaryUrl);
            articleSummaries[id] = summaryResponse.data;
        } catch (error) {
            console.error(`Failed to fetch summary for ID ${id}:`, error);
            articleSummaries[id] = { error: 'Failed to fetch summary' };
        }
    }

    return articleSummaries;
}

async function fetchFigures(ids: string[], maxFigures: number = 1): Promise<any> {
    const figures: any = {};

    for (const id of ids) {
        const articleUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/`;
        try {
            const response = await axios.get(articleUrl);
            const htmlContent = response.data;

            // Use a regular expression to find figure image URLs and their links
            const figureRegex = /<a[^>]+href="([^"]+\/figure\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+\/bin\/[^"]+)"[^>]*>/g;
            let match;
            const figureInfo = [];
            while ((match = figureRegex.exec(htmlContent)) !== null && figureInfo.length < maxFigures) {
                figureInfo.push({
                    figureLink: `https://www.ncbi.nlm.nih.gov${match[1]}`,
                    imageUrl: `https://www.ncbi.nlm.nih.gov${match[2]}`
                });
            }

            figures[id] = figureInfo;

        } catch (error) {
            console.error(`Failed to fetch figures for ID ${id}:`, error);
            figures[id] = { error: 'Failed to fetch figures' };
        }
    }

    return figures;
}

app.get('/search', async (req: Request, res: Response) => {
    try {
        const userQuery = req.query.q ? req.query.q.toString() : '';
        console.log(userQuery);

        const geminiKeywords = await fetchGeminiKeywords(userQuery);
        console.log(geminiKeywords);

        const searchData = await searchNCBI(geminiKeywords);

        if (searchData.esearchresult.idlist.length > 0) {
            const ids = searchData.esearchresult.idlist;
            console.log(ids);

            const articleSummaries = await fetchArticleSummaries(ids);
            const figures = await fetchFigures(ids);
            const summary = await summarizeArticles(userQuery, articleSummaries);
            res.send({summary, figures});

        } else {
            res.status(404).send('No full-text articles found.');
        }
    } catch (error) {
        console.error("Error in /search route:", error);
        
        if (error instanceof Error) {
            res.status(500).send(error.message);
        } else {
            res.status(500).send("An unexpected error occurred.");
        }
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});