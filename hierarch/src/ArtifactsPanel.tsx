import React, { useState } from 'react';

interface CodeSnippet {
  id: number;
  code: string;
}

interface ArtifactsPanelProps {
  codeSnippets: CodeSnippet[];
}

const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({ codeSnippets }) => {
  const [activeTab, setActiveTab] = useState<number | null>(codeSnippets[0]?.id || null);

  return (
    <div className="artifacts-panel">
      <h3>Detected Code Snippets</h3>
      {codeSnippets.length > 0 ? (
        <div>
          <div className="tabs">
            {codeSnippets.map((snippet) => (
              <button
                key={snippet.id}
                className={`tab ${activeTab === snippet.id ? 'active' : ''}`}
                onClick={() => setActiveTab(snippet.id)}
              >
                Snippet {snippet.id}
              </button>
            ))}
          </div>
          <div className="tab-content">
            {codeSnippets.map((snippet) => (
              <div
                key={snippet.id}
                className={`code-snippet ${activeTab === snippet.id ? 'active' : ''}`}
              >
                <pre className="code-block">
                  <code>{snippet.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p>No code snippets detected yet.</p>
      )}
    </div>
  );
};

export default ArtifactsPanel;