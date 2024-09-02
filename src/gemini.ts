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
  
