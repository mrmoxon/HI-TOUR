import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import ChatInterface from './ChatInterface.tsx';
import ArtifactsPanel from './ArtifactsPanel.tsx';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  fontSize: number;
}

interface CodeSnippet {
    id: number;
    code: string;
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
    const [isFontSizeAdjustable, setIsFontSizeAdjustable] = useState(true);
    const [codeSnippets, setCodeSnippets] = useState<CodeSnippet[]>([]);
    
  const cycleColorScheme = () => {
    setSchemeIndex((prevIndex) => (prevIndex + 1) % schemes.length);
  };

  const toggleFontSizeAdjustment = () => {
    setIsFontSizeAdjustable(!isFontSizeAdjustable);
  };

  const adjustFontSize = (increment: number) => {
    if (isFontSizeAdjustable) {
      setFontSize(prevSize => Math.min(Math.max(prevSize + increment, 12), 24));
    }
  };

  const handleCodeDetected = (code: string) => {
    setCodeSnippets(prev => [...prev, { id: prev.length + 1, code }]);
  };

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
    <div className={`app ${schemes[schemeIndex]}`} style={{ fontSize: `${fontSize}px` }}>
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
          <ChatInterface onCodeDetected={handleCodeDetected} />
        </Panel>
        <Panel title="Interface" fontSize={fontSize}>
          <ChatInterface onCodeDetected={handleCodeDetected} />
        </Panel>
        <Panel title="Artifacts" fontSize={fontSize}>
          <ArtifactsPanel codeSnippets={codeSnippets} />
        </Panel>
      </div>
    </div>
  );
};

export default App;