import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

interface PanelProps {
  title: string;
  children: React.ReactNode;
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
  const [backendMessage, setBackendMessage] = useState('');

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
    <div className="app">
      <Panel title="Gantt">
        <p>Content for Panel 1</p>
      </Panel>
      <Panel title="Interface">
        <p>Content for Panel 2</p>
        <p>Backend message: {backendMessage}</p>
      </Panel>
      <Panel title="Artifacts">
        <p>Content for Panel 3</p>
      </Panel>
    </div>
  );
};

export default App;