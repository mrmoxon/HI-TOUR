import React, { useState, useCallback } from 'react';
import ChatInterface from './ChatInterface.tsx';

interface Agent {
    name: string;
    systemPrompt: string;
    messages: Message[];
    apiMessages: ApiMessage[];
    isGenerating: boolean;
}

interface AgentTabsProps {
    onCodeDetected: (code: string) => number;
    onSnippetButtonClick: (snippetId: number) => void;
    onSnippetDelete: (snippetId: number) => void;
    deletedSnippets: number[];
}

interface Message {
    text: string;
    isUser: boolean;
    snippets: { id: number; code: string }[];
    formattedContent?: FormattedContent[];
}

interface ApiMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface FormattedContent {
    type: 'text' | 'code';
    content: string;
    language?: string;
    action?: 'ADD' | 'DELETE';
}

const initialAgents: Agent[] = [
    { 
        name: 'Coder', 
        systemPrompt: 'You are a helpful coding assistant.',
        messages: [],
        apiMessages: [{ role: 'system', content: 'You are a helpful coding assistant.' }],
        isGenerating: false
    },
    { 
        name: 'Writer', 
        systemPrompt: 'You are a helpful writing assistant.',
        messages: [],
        apiMessages: [{ role: 'system', content: 'You are a helpful writing assistant.' }],
        isGenerating: false
    },
];

const AgentTabs: React.FC<AgentTabsProps> = ({
    onCodeDetected,
    onSnippetButtonClick,
    onSnippetDelete,
    deletedSnippets,
}) => {
    const [agents, setAgents] = useState<Agent[]>(initialAgents);
    const [activeAgent, setActiveAgent] = useState<string>(agents[0].name);

    const handleAgentChange = useCallback((agentName: string) => {
        setActiveAgent(agentName);
    }, []);

    const updateAgentMessages = useCallback((agentName: string, newMessages: Message[], newApiMessages: ApiMessage[]) => {
        setAgents(prevAgents => 
            prevAgents.map(agent => 
                agent.name === agentName 
                    ? { ...agent, messages: newMessages, apiMessages: newApiMessages }
                    : agent
            )
        );
    }, []);

    const setAgentGeneratingStatus = useCallback((agentName: string, isGenerating: boolean) => {
        setAgents(prevAgents => 
            prevAgents.map(agent => 
                agent.name === agentName 
                    ? { ...agent, isGenerating }
                    : agent
            )
        );
    }, []);

    return (
        <div className="agent-tabs-container">
            <div className="agent-tabs">
                {agents.map((agent) => (
                    <button
                        key={agent.name}
                        className={`agent-tab ${agent.name.toLowerCase()} ${activeAgent === agent.name ? 'active' : ''} ${agent.isGenerating ? 'generating' : ''}`}
                        onClick={() => handleAgentChange(agent.name)}
                    >
                        {agent.name}
                        {agent.isGenerating && <span className="generating-indicator">...</span>}
                    </button>
                ))}
            </div>
            {agents.map((agent) => (
                <div key={agent.name} style={{ display: activeAgent === agent.name ? 'block' : 'none' }}>
                    <ChatInterface
                        onCodeDetected={onCodeDetected}
                        onSnippetButtonClick={onSnippetButtonClick}
                        onSnippetDelete={onSnippetDelete}
                        deletedSnippets={deletedSnippets}
                        systemPrompt={agent.systemPrompt}
                        agentName={agent.name}
                        messages={agent.messages}
                        apiMessages={agent.apiMessages}
                        updateAgentMessages={(newMessages, newApiMessages) => updateAgentMessages(agent.name, newMessages, newApiMessages)}
                        setAgentGeneratingStatus={(isGenerating) => setAgentGeneratingStatus(agent.name, isGenerating)}
                    />
                </div>
            ))}
        </div>
    );
};

export default AgentTabs;