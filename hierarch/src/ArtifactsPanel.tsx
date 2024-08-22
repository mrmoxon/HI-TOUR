// ArtifactsPanel.tsx
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
    deleteCodeSnippet: (id: number) => void;
    fontSize: number;
    activeSnippetId: number | null;
}  

const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({ 
    codeSnippets, 
    updateCodeSnippet, 
    deleteCodeSnippet,
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
        } else if (codeSnippets.length > 0) {
          setActiveTab(codeSnippets[codeSnippets.length - 1].id);
        }
    }, [codeSnippets, activeSnippetId]);
    
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
    
    const handleTabClick = (snippetId: number) => {
        setActiveTab(snippetId);
    };

    const handleDeleteSnippet = (snippetId: number) => {
        deleteCodeSnippet(snippetId);
        if (activeTab === snippetId) {
            setActiveTab(null);
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
                            <div key={snippet.id} className="tab-wrapper">
                                <button
                                    className={`tab ${activeTab === snippet.id ? 'active' : ''}`}
                                    onClick={() => handleTabClick(snippet.id)}
                                >
                                    Snippet
                                </button>
                                <button
                                    className="delete-tab-button"
                                    onClick={() => handleDeleteSnippet(snippet.id)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
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