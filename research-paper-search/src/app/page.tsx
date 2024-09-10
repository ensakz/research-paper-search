'use client';

import { useState } from 'react';
import React from 'react';

interface SearchResults {
  summary: string;
  figures: Record<string, string[]>;
  error?: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data: SearchResults = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error fetching results:', error);
      setResults({ error: 'Failed to fetch results', summary: '', figures: {} });
    }
    setLoading(false);
  };

  return (
    <main className="container mt-4">
      <h1 className="mb-4">Research Paper Search</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your research question"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {results && (
        <div>
          {results.error ? (
            <p className="text-danger">{results.error}</p>
          ) : (
            <>
              <h2 className="mb-2">Summary</h2>
              <div 
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: results.summary }}
              />
              <h2 className="mb-2">Figures</h2>
              <div className="row row-cols-2 g-4">
                {Object.entries(results.figures).map(([id, urls]) => (
                  urls.map((url, index) => (
                    <div key={`${id}-${index}`} className="col">
                      <img src={url} alt={`Figure from PMC${id}`} className="img-fluid" />
                    </div>
                  ))
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}