import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeSnippet {
    id: number;
    code: string;
    language: string;
}

interface ArtifactsPanelProps {
    codeSnippets: CodeSnippet[];
    updateCodeSnippet: (id: number, newCode: string) => void;
    fontSize: number;
    activeSnippetId: number | null;
}  

const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({ 
    codeSnippets, 
    updateCodeSnippet, 
    fontSize,
    activeSnippetId
  }) => {
    const [activeTab, setActiveTab] = useState<number | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editableCode, setEditableCode] = useState<string>('');
    const editableRef = useRef<HTMLPreElement>(null);  
  
    useEffect(() => {
        if (activeSnippetId !== null) {
          setActiveTab(activeSnippetId);
        } else if (codeSnippets.length > 0 && activeTab === null) {
          setActiveTab(codeSnippets[codeSnippets.length - 1].id);
        }
      }, [codeSnippets, activeTab, activeSnippetId]);
    
    useEffect(() => {
        if (activeTab !== null) {
          const activeSnippet = codeSnippets.find(snippet => snippet.id === activeTab);
          if (activeSnippet) {
            setEditableCode(activeSnippet.code);
          }
        }
    }, [activeTab, codeSnippets]);
    

    const handleCodeChange = useCallback((id: number, newCode: string) => {
        updateCodeSnippet(id, newCode);
    }, [updateCodeSnippet]);
    
    const handleEditableChange = (e: React.FormEvent<HTMLPreElement>) => {
        if (activeTab !== null) {
          const newCode = e.currentTarget.textContent || '';
          handleCodeChange(activeTab, newCode);
        }
      };
    
      return (
        <div className="artifacts-panel">
        <div className="panel-controls">
          <label>
            <input
              type="checkbox"
              checked={isEditMode}
              onChange={() => setIsEditMode(!isEditMode)}
            />
            Edit
          </label>
        </div>
        {codeSnippets.length > 0 ? (
          <div className="artifacts-content">
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
              {activeTab !== null && (
                <div className="code-snippet active">
                  <div className="code-bg">
                    {isEditMode ? (
                      <pre
                        ref={editableRef}
                        contentEditable
                        onInput={handleEditableChange}
                        className="editable-code"
                        style={{
                          fontSize: `${fontSize}px`,
                        }}
                      >
                        {editableCode}
                      </pre>
                    ) : (
                      <div className="syntax-highlighter-container">
                        <SyntaxHighlighter
                          language={codeSnippets.find(s => s.id === activeTab)?.language || 'javascript'}
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: 0,
                            backgroundColor: 'transparent',
                            fontSize: `${fontSize}px`,
                          }}
                          wrapLongLines={false}
                        >
                          {codeSnippets.find(s => s.id === activeTab)?.code || ''}
                        </SyntaxHighlighter>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p>No code snippets detected yet.</p>
        )}
      </div>
    );
  };
    
export default ArtifactsPanel;