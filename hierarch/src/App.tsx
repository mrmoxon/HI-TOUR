// App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import ChatInterface from './ChatInterface.tsx';
import ArtifactsPanel from './ArtifactsPanel.tsx';
import AgentTabs from './AgentTabs.tsx';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  fontSize: number;
}

interface CodeSnippet {
    id: number;
    code: string;
    language: string;
}
  
const Panel: React.FC<PanelProps> = ({ title, children }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
  
    return (
      <div className={`panel ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="panel-header" onClick={() => setIsCollapsed(!isCollapsed)}>
          <h2>{title}</h2>
          <span className="panel-icon">{isCollapsed ? '▶' : '◀'}</span>
        </div>
        <div className="panel-content">
          {children}
        </div>
      </div>
    );
};
  
const App: React.FC = () => {
    const schemes = ['sandy-pastel', 'ivy-green', 'ocean-blue', 'sunset-orange', 'lavender-dream'];
    const [backendMessage, setBackendMessage] = useState('');
    const [schemeIndex, setSchemeIndex] = useState(0);
    const [fontSize, setFontSize] = useState(16);
    const [codeSnippets, setCodeSnippets] = useState<CodeSnippet[]>([]);
    const [activeSnippetId, setActiveSnippetId] = useState<number | null>(null);
    const [deletedSnippets, setDeletedSnippets] = useState<number[]>([]);

    const cycleColorScheme = () => {
        setSchemeIndex((prevIndex) => (prevIndex + 1) % schemes.length);
    };

    const adjustFontSize = (increment: number) => {
        setFontSize(prevSize => Math.min(Math.max(prevSize + increment, 12), 24));
    };

    const detectLanguage = (code: string): string => {
        if (code.includes('class') || code.includes('interface')) return 'typescript';
        if (code.includes('func') || code.includes('let')) return 'swift';
        if (code.includes('def') || code.includes('print(')) return 'python';
        if (code.includes('package') || code.includes('public class')) return 'java';
        return 'javascript'; // Default to JavaScript
    };  

    const handleCodeDetected = useCallback((code: string) => {
        const language = detectLanguage(code);
        const newSnippet = { id: Date.now(), code, language };
        setCodeSnippets(prev => [...prev, newSnippet]);
        return newSnippet.id;
    }, []);

    const updateCodeSnippet = useCallback((id: number, newCode: string) => {
        setCodeSnippets(prev => prev.map(snippet => 
            snippet.id === id ? { ...snippet, code: newCode } : snippet
        ));
    }, []);

    const deleteCodeSnippet = useCallback((id: number) => {
        setCodeSnippets(prev => prev.filter(snippet => snippet.id !== id));
        setDeletedSnippets(prev => [...prev, id]);
        if (activeSnippetId === id) {
            setActiveSnippetId(null);
        }
    }, [activeSnippetId]);

    const handleSnippetButtonClick = useCallback((snippetId: number) => {
        setActiveSnippetId(snippetId);
    }, []);

    useEffect(() => {
        axios.get('http://localhost:5000/api/hello')
            .then(response => {
                setBackendMessage(response.data.message);
            })
            .catch(error => {
                console.error('Error fetching data: ', error);
                setBackendMessage('Error connecting to backend');
            });
    }, []);

    return (
        <div className={`app ${schemes[schemeIndex]} dark`} style={{ fontSize: `${fontSize}px` }}>
            <div className="sidebar">
                <button onClick={cycleColorScheme} className="scheme-toggle">
                    Switch Theme
                </button>
                <button
                    onClick={() => adjustFontSize(2)}
                    className="zoom-button zoom-button-top"
                >
                    +
                </button>
                <button
                    onClick={() => adjustFontSize(-2)}
                    className="zoom-button zoom-button-bottom"
                >
                    -
                </button>
            </div>
            <div className="main-content">
                <Panel title="Gantt" fontSize={fontSize}>
                    <AgentTabs 
                        onCodeDetected={handleCodeDetected}
                        onSnippetButtonClick={handleSnippetButtonClick}
                        onSnippetDelete={deleteCodeSnippet}
                        deletedSnippets={deletedSnippets}
                    />
                </Panel>
                <Panel title="Interface" fontSize={fontSize}>
                    <AgentTabs 
                        onCodeDetected={handleCodeDetected}
                        onSnippetButtonClick={handleSnippetButtonClick}
                        onSnippetDelete={deleteCodeSnippet}
                        deletedSnippets={deletedSnippets}
                    />
                </Panel>
                <Panel title="Artifacts" fontSize={fontSize}>
                    <ArtifactsPanel 
                        codeSnippets={codeSnippets} 
                        updateCodeSnippet={updateCodeSnippet}
                        deleteCodeSnippet={deleteCodeSnippet}
                        fontSize={fontSize}
                        activeSnippetId={activeSnippetId}
                    />
                </Panel>
            </div>
        </div>
    );
};

export default App;