// AgentTabs.tsx
import React, { useState, useCallback } from 'react';
import ChatInterface from './ChatInterface.tsx';
import { useSnippets } from './SnippetContext.tsx';

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
    snippets: Snippet[];
    updateSnippet: (id: number, newContent: string, type: 'markdown' | 'code', language?: string, name?: string) => void;
    agents: Agent[];
    setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
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

interface HighlightInfo {
    start: number;
    end: number;
    color: 'red' | 'green';
}

const coderPrompt = `
You are a helpful coding assistant. Your primary role is to assist with coding tasks, provide explanations, and suggest improvements to code. 

When editing code, follow these guidelines:

In order to replace code, you must add and delete the code in specific blocks that target the changes. For example:

Format: \`\`\`[action(ADD/DELETE/highlight-green/highlight-red)] [language] [snippet_id]\n[line number][syntax]\n[line number] [syntax]\n...\`\`\`

1. Adding Code: To suggest adding new code, use: \`\`\`ADD [language]
// for example: \`\`\`ADD javascript snippet_id:abc123\n23 // Additional logging statement\n24 const new_function:\n25 ...\`\`\`

2. Deleting Code: To suggest deleting code, use: \`\`\`DELETE [language]
// for example: \`\`\`DELETE python snippet_id:abc123\n30 MAX_RETRIES = 5\n31 RETRY_DELAY = 5\`\`\`

3. Highlighting Code: To highlight important parts of the code, use:
   \`\`\`highlight-green [language] [snippet_id:abc123]\n
   [line number] [syntax]\n[line number] [syntax]\n...
   \`\`\`
   or
   \`\`\`highlight-red [language] [snippet_id:abc123]\n
   [line number] [syntax]\n[line number] [syntax]\n...
   \`\`\`

4. Explanations: Provide clear explanations for your suggestions or when answering questions. Use markdown formatting for better readability.

5. Line Numbers: When referring to specific lines of code, use line numbers if possible. The system will automatically add line numbers to code blocks.

Remember to specify the snippet each time you suggest code, and stick to these formats to ensure your responses are correctly interpreted and displayed.
`;

const initialAgents: Agent[] = [
    { 
        name: 'Coder', 
        systemPrompt: coderPrompt,
        messages: [],
        apiMessages: [{ role: 'system', content: coderPrompt }],
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

    const { state, dispatch } = useSnippets();
    const { snippets, activeSnippetId } = state;
  
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
                        agentName={agent.name}
                        systemPrompt={agent.systemPrompt}
                        messages={agent.messages}
                        apiMessages={agent.apiMessages}
                        updateAgentMessages={(newMessages, newApiMessages) => updateAgentMessages(agent.name, newMessages, newApiMessages)}
                        setAgentGeneratingStatus={(isGenerating) => setAgentGeneratingStatus(agent.name, isGenerating)}
                        onCodeDetected={onCodeDetected}
                        onSnippetButtonClick={onSnippetButtonClick}
                        onSnippetDelete={onSnippetDelete}
                        deletedSnippets={deletedSnippets}
                    />
                </div>
            ))}
        </div>
    );
};

export default AgentTabs;

