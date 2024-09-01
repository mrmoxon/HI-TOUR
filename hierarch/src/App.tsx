import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import { SnippetProvider } from './SnippetContext.tsx';
import { SnippetManagerProvider } from './SnippetManager.tsx';
import ArtifactsPanel from './ArtifactsPanel.tsx';
import AgentTabs from './AgentTabs.tsx';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  isCollapsed: boolean;
  onCollapse: () => void;
  width: string;
}

interface Snippet {
  id: number;
  content: string;
  type: 'markdown' | 'code';
  language?: string;
}

const Panel: React.FC<PanelProps> = ({ title, children, isCollapsed, onCollapse, width }) => {
  return (
    <div className={`panel ${isCollapsed ? 'collapsed' : ''}`} style={{ width, minWidth: isCollapsed ? '40px' : width, maxWidth: width }}>
      <div className="panel-header" onClick={onCollapse}>
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
  const [schemeIndex, setSchemeIndex] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [activeSnippetId, setActiveSnippetId] = useState<number | null>(null);
  const [deletedSnippets, setDeletedSnippets] = useState<number[]>([]);
  const [panelMode, setPanelMode] = useState<'1-panel' | '2-panel' | '3-panel'>('3-panel');
  const [collapsedPanels, setCollapsedPanels] = useState({
    gantt: false,
    interface: false,
    artifacts: false,
  });

  const cycleColorScheme = () => {
    setSchemeIndex((prevIndex) => (prevIndex + 1) % schemes.length);
  };

  const togglePanelMode = () => {
    setPanelMode(prevMode => {
      if (prevMode === '3-panel') return '2-panel';
      if (prevMode === '2-panel') return '1-panel';
      return '3-panel';
    });
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
    const newSnippet: Snippet = {
        id: Date.now(),
        content: code,
        type: 'code',
        language: detectLanguage(code),
        name: `Code ${snippets.length + 1}`
    };
    setSnippets(prev => [...prev, newSnippet]);
    return newSnippet.id;
}, [snippets.length]);

  const updateSnippet = useCallback((id: number, newContent: string, type: 'markdown' | 'code', language?: string) => {
    setSnippets(prev => {
      const existingIndex = prev.findIndex(snippet => snippet.id === id);
      if (existingIndex >= 0) {
        return prev.map(snippet =>
          snippet.id === id ? { ...snippet, content: newContent, type, language } : snippet
        );
      } else {
        return [...prev, { id, content: newContent, type, language }];
      }
    });
  }, []);
    
  const deleteSnippet = useCallback((id: number) => {
    setSnippets(prev => prev.filter(snippet => snippet.id !== id));
    setDeletedSnippets(prev => [...prev, id]);
    if (activeSnippetId === id) {
      setActiveSnippetId(null);
    }
  }, [activeSnippetId]);

  const handleSnippetButtonClick = useCallback((snippetId: number) => {
    setActiveSnippetId(snippetId);
  }, []);

  const getVisiblePanelsCount = () => {
    return Object.values(collapsedPanels).filter(isCollapsed => !isCollapsed).length;
  };

  const getPanelWidth = (panelName: keyof typeof collapsedPanels) => {
    const visiblePanelsCount = getVisiblePanelsCount();
    const isCollapsed = collapsedPanels[panelName];
    
    if (isCollapsed) {
      return '40px';
    }

    const availableWidth = `calc(100vw - 60px - ${40 * (3 - visiblePanelsCount)}px)`;

    switch (visiblePanelsCount) {
      case 1:
        return availableWidth;
      case 2:
        return `calc(${availableWidth} / 2)`;
      case 3:
        return `calc(${availableWidth} / 3)`;
      default:
        return '0px';
    }
  };

  const togglePanelCollapse = (panelName: keyof typeof collapsedPanels) => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panelName]: !prev[panelName]
    }));
  };

  useEffect(() => {
    const visiblePanelsCount = getVisiblePanelsCount();
    if (visiblePanelsCount === 1) {
      setPanelMode('1-panel');
    } else if (visiblePanelsCount === 2) {
      setPanelMode('2-panel');
    } else {
      setPanelMode('3-panel');
    }
  }, [collapsedPanels]);

  return (
    <SnippetProvider>

        <SnippetManagerProvider>
        <div className={`app ${schemes[schemeIndex]} dark`} style={{ fontSize: `${fontSize}px` }}>
        <div className="sidebar">
            <button onClick={cycleColorScheme} className="scheme-toggle">
            Switch Theme
            </button>
            <button onClick={() => adjustFontSize(2)} className="zoom-button zoom-button-top">
            +
            </button>
            <button onClick={() => adjustFontSize(-2)} className="zoom-button zoom-button-bottom">
            -
            </button>
        </div>
        <div className="main-content" style={{ display: 'flex', overflow: 'hidden' }}>
            <Panel 
                title="Gantt" 
                isCollapsed={collapsedPanels.gantt}
                onCollapse={() => togglePanelCollapse('gantt')}
                width={getPanelWidth('gantt')}
            >
                <AgentTabs />
            </Panel>
            <Panel 
                title="Interface" 
                isCollapsed={collapsedPanels.interface}
                onCollapse={() => togglePanelCollapse('interface')}
                width={getPanelWidth('interface')}
            >
                <AgentTabs />
            </Panel>
            <Panel 
                title="Artifacts" 
                isCollapsed={collapsedPanels.artifacts}
                onCollapse={() => togglePanelCollapse('artifacts')}
                width={getPanelWidth('artifacts')}
            >
                <ArtifactsPanel fontSize={fontSize} />
            </Panel>
            </div>
        </div>
        </SnippetManagerProvider>
    
    </SnippetProvider>
  );
};

export default App;