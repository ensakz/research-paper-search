import express, { Request, Response } from 'express';
import axios from 'axios';
import config from './config.json';
import run from './gemini'; // Your Gemini function

const app = express();
const port = 3000;

interface ArticleSummary {
    [key: string]: string | object; 
}

app.get('/search', async (req: Request, res: Response) => {
    try {
        const userQuery = req.query.q ? req.query.q.toString() : '';
        console.log(userQuery);
        const geminiResponse = await run(userQuery);

        // ... (Your logic to safely execute and extract the query 
        //      from the geminiResponse - replace eval() with a 
        //      secure method in production)

        const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
        const email = config.email;
        const apiKey = config.apiKey;
        const sort = 'relevance';
        const retmax = 20;

        let searchData;
        let articleSummaries: ArticleSummary = {};
        console.log(geminiResponse);

        try {
            if (geminiResponse) {
                const geminiKeyWords = await geminiResponse;
                console.log(geminiKeyWords);
                const searchUrl = `${baseUrl}/esearch.fcgi?db=pmc&term=${encodeURIComponent(geminiKeyWords)}+AND+free+full+text[filter]&sort=${sort}&retmode=json&retmax=20&email=${email}&api_key=${apiKey}`;                console.log(searchUrl);
                const searchResponse = await axios.get(searchUrl);
                searchData = searchResponse.data;
                console.log(searchData);

                console.log(searchData.esearchresult.idlist.length);

                if (searchData.esearchresult.idlist.length > 0) {
                    const ids = searchData.esearchresult.idlist;
                    console.log(ids)

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
                    res.send(articleSummaries); 
                    //articleSummaries = {};
                } else {
                    res.status(404).send('No full-text articles found.');
                }
            } else {
                res.status(400).send('No query processed by Gemini yet.');
            }
        } catch (error) {
            console.error('Failed to retrieve ids from esearch:', error);
            res.status(500).send('Failed to retrieve data from NCBI.');
        }

    } catch (error) {
        console.error("Error in /search route:", error);
        res.status(500).send("An error occurred during the search.");
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
