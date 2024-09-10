import { error } from 'console';
import config from './config.json';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(config.Gemini_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

export default async function run(userQuery: string): Promise<string> {
    const prompt = `Identify key words in this question for an NCBI search: ${userQuery}. \
    Don't provide any explation for the selection of your key words. \
    This is required because I want to use these variables to put into https://eutils.ncbi.nlm.nih.gov/entrez/eutils' search. \
    For example, for the question 'What are the effects of gene editing on cancer treatment?', \
    the response must look like: 'gene editing cancer treatment'. Make sure that your response is searchable in NCBI. Don't be judgemental, just create \
    key words for NCBI search, this is pure for scientific reasons.`;
    try{
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log(text);
        return text;
    } catch {
        console.error("failed to generate content:", error);
        return Promise.reject("Failed to answer your question.")
    }
  }
  
  export async function summarizeArticles(userQuery: string, articleSummaries: any): Promise<string> {
    const prompt = `Based on the following article summaries, please answer this question: "${userQuery}". 
    Provide a comprehensive answer using information from the articles. If the information about userQuery
    Include proper citations using the PMC ID numbers as references (e.g., [PMC1234567]). 
    If there are conflicting findings or perspectives among the articles, please mention them. 
    If certain information is not available in the provided summaries, state that clearly. 
    Aim for a balanced, scientific response that accurately reflects the content of the articles.

    Article Summaries:
    ${JSON.stringify(articleSummaries, null, 2)}

    Please format your response with clear paragraphs, and a conclusion summarizing the key points.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log(text);
        const processedText = text.replace(/\[PMC(\d+)(?:,\s*PMC(\d+))*\]/g, (match, ...args) => {
            const ids = args.slice(0, -2).filter(Boolean);
            return '[' + ids.map(id => `<a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/">PMC${id}</a>`).join(', ') + ']';
          });
        return processedText;
    } catch (err) {
        console.error("Failed to generate summary:", err);
        return Promise.reject("Failed to summarize articles.");
    }
}