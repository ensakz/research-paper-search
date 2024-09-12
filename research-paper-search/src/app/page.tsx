'use client';

import { useState } from 'react';
import React from 'react';

interface FigureInfo {
  imageUrl: string;
  figureLink: string;
}

interface SearchResults {
  summary: string;
  figures: Record<string, FigureInfo[]>;
  error?: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<FigureInfo | null>(null);

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

  const handleImageClick = (figureInfo: FigureInfo) => {
    setSelectedImage(figureInfo);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
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
                {Object.entries(results.figures).flatMap(([id, figures]) => 
                  figures.map((figure, index) => (
                    <div key={`${id}-${index}`} className="col">
                      <div className="card">
                        <img 
                          src={figure.imageUrl} 
                          alt={`Figure ${index + 1} from PMC${id}`} 
                          className="card-img-top" 
                          onClick={() => handleImageClick(figure)}
                          style={{ cursor: 'pointer', objectFit: 'contain', height: '200px' }}
                        />
                        <div className="card-body">
                          <h5 className="card-title">Figure {index + 1}</h5>
                          <a 
                            href={figure.figureLink}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-primary btn-sm"
                          >
                            View Figure on PMC
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {selectedImage && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Figure</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">
                <img src={selectedImage.imageUrl} alt="Selected Figure" className="img-fluid" />
                <a 
                  href={selectedImage.figureLink}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary btn-sm mt-2"
                >
                  View on PMC
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}