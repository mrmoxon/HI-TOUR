import React, { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useSnippets } from './SnippetContext.tsx';
import { useSnippetManager } from './SnippetManager.tsx';

interface Message {
    text: string;
    isUser: boolean;
    snippets: { id: number; code: string }[];
    formattedContent?: FormattedContent[];
}

interface HighlightInfo {
    start: number;
    end: number;
    color: 'red' | 'green';
}

interface ChatInterfaceProps {
    systemPrompt: string;
    agentName: string;
    messages: Message[];
    apiMessages: ApiMessage[];
    updateAgentMessages: (newMessages: Message[], newApiMessages: ApiMessage[]) => void;
    setAgentGeneratingStatus: (isGenerating: boolean) => void;
}

interface FormattedContent {
    type: 'text' | 'code';
    content: string;
    language?: string;
    action?: 'ADD' | 'DELETE';
    highlights?: HighlightInfo[];
}

interface ProcessedMessage extends Message {
    processedContent: string;
}

interface ApiMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface CodeChange {
    type: 'ADD' | 'DELETE' | 'HIGHLIGHT';
    start: number;
    end: number;
    content?: string;
    color?: 'red' | 'green';
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
    systemPrompt,
    agentName,
    messages,
    apiMessages,
    updateAgentMessages,
    setAgentGeneratingStatus
}) => {
    const [input, setInput] = useState('');
    const [inputSnippets, setInputSnippets] = useState<string[]>([]);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [processedMessages, setProcessedMessages] = useState<ProcessedMessage[]>([]);
    const { state, dispatch } = useSnippets();
    const { snippets, addSnippet, updateSnippet, deleteSnippet, setActiveSnippet } = useSnippetManager();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        const snippetIds = Object.keys(snippets);
        setInputSnippets(prevInputSnippets => {
            const newInputSnippets = prevInputSnippets.filter(id => snippetIds.includes(id));
            const addedSnippets = snippetIds.filter(id => !prevInputSnippets.includes(id));
            return [...newInputSnippets, ...addedSnippets];
        });
    }, [snippets]);

    useEffect(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    const getPlaceholder = () => {
        switch (agentName) {
            case 'Coder':
                return 'Ask about code, debugging, or programming concepts...';
            case 'Writer':
                return 'Ask for writing assistance, ideas, or language help...';
            default:
                return 'Type your message...';
        }
    };

    const detectCode = (text: string): boolean => {
        const codeIndicators = [
            /{/, /}/, /function/, /class/, /if \(/, /for \(/, /while \(/,
            /const /, /let /, /var /, /=>/, /import /, /export /
        ];
        const lines = text.split('\n');
        const codeConfidence = codeIndicators.reduce((count, indicator) => 
            count + (indicator.test(text) ? 1 : 0), 0);

        return codeConfidence >= 3 || (lines.length > 1 && codeConfidence >= 2);
    };

    const detectLanguage = (code: string): string => {
        if (code.includes('class') || code.includes('interface')) return 'typescript';
        if (code.includes('func') || code.includes('let')) return 'swift';
        if (code.includes('def') || code.includes('print(')) return 'python';
        if (code.includes('package') || code.includes('public class')) return 'java';
        return 'javascript'; // Default to JavaScript
    };

    const processMessages = (messages: Message[]): ProcessedMessage[] => {
        const snippetVersions: { [key: string]: number } = {};

        return messages.map((message) => {
            let processedSnippets = [...(message.snippets || [])];

            processedSnippets = processedSnippets.filter((snippetId) => {
                if (snippetId in snippetVersions) {
                    snippetVersions[snippetId]++;
                    return false; // Filter out older versions
                } else {
                    snippetVersions[snippetId] = 1;
                    return true; // Keep the latest version
                }
            });

            return { ...message, processedSnippets, processedContent: message.text };
        });
    };

    const handleCodeDetected = (code: string) => {
        const newSnippet = {
            name: `Code ${Object.keys(snippets).length + 1}`,
            content: code,
            language: detectLanguage(code),
        };
        const newSnippetId = addSnippet(newSnippet);
        return newSnippetId;
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (detectCode(pastedText)) {
          e.preventDefault();
          const snippetId = handleCodeDetected(pastedText);
          setInputSnippets(prev => [...prev, snippetId]);
        }
    };

    const handleSnippetButtonClick = (snippetId: string) => {
        setActiveSnippet(snippetId);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
    };

    const handleDeleteSnippet = (snippetId: string) => {
        setInput(prev => prev.replace(`[Code Snippet ${snippetId}]`, ''));
        setInputSnippets(prev => prev.filter(id => id !== snippetId));
        deleteSnippet(snippetId);
    };

    const CodeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
    );

    const CodeBlock: React.FC<{ content: string; language: string; snippetId: string; action?: 'ADD' | 'DELETE'; highlights: HighlightInfo[] }> = ({ content, language, snippetId, action, highlights }) => (
        <div className={`code-block ${action ? action.toLowerCase() : ''}`}>
            <div className="code-block-header">
                <span className="language-label">{language}</span>
                <span className="snippet-id">Snippet ID: {snippetId}</span>
                {action && (
                    <span className={`action-label ${action.toLowerCase()}`}>
                        {action}
                    </span>
                )}
            </div>
            <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{
                    margin: 0,
                    borderBottomLeftRadius: '5px',
                    borderBottomRightRadius: '5px',
                }}
                wrapLines={true}
                showLineNumbers={true}
                lineProps={(lineNumber) => {
                    const highlight = highlights.find(h => lineNumber >= h.start && lineNumber <= h.end);
                    return {
                        style: highlight ? { 
                            backgroundColor: highlight.color === 'red' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 255, 0, 0.3)',
                            display: 'block',
                            width: '100%'
                        } : {},
                    };
                }}
            >
                {content}
            </SyntaxHighlighter>
        </div>
    );

    const TextBlock: React.FC<{ content: string; highlights: HighlightInfo[] }> = ({ content, highlights }) => {
        const lines = content.split('\n');
        return (
            <div className="text-block">
                {lines.map((line, index) => {
                    const lineNumber = index + 1;
                    const highlight = highlights.find(h => lineNumber >= h.start && lineNumber <= h.end);
                    return (
                        <div 
                            key={index} 
                            className={highlight ? `highlight-${highlight.color}` : ''}
                        >
                            {line}
                        </div>
                    );
                })}
            </div>
        );
    };

    const formatMessage = (message: ProcessedMessage) => {
        if (message.formattedContent) {
            return message.formattedContent.map((part, partIndex) => 
                part.type === 'code' ? (
                    <CodeBlock
                        key={partIndex}
                        content={part.content}
                        language={part.language || 'plaintext'}
                        action={part.action}
                        highlights={part.highlights || []}
                    />
                ) : (
                    <TextBlock
                        key={partIndex}
                        content={part.content}
                        highlights={part.highlights || []}
                    />
                )
            );
        } else {
            return (
                <>
                    <span>{message.text}</span>
                    {message.snippets && message.snippets.length > 0 && (
                        <div className="snippet-references">
                            {message.snippets.map((snippetId) => (
                                snippets[snippetId] ? (
                                    <button
                                        key={snippetId}
                                        onClick={() => handleSnippetButtonClick(snippetId)}
                                        className="snippet-reference-button"
                                    >
                                        <CodeIcon />
                                        <span>{snippets[snippetId].name}</span>
                                    </button>
                                ) : (
                                    <span key={snippetId} className="deleted-snippet-reference">
                                        <CodeIcon />
                                        <span>deleted</span>
                                    </span>
                                )
                            ))}
                        </div>
                    )}
                </>
            );
        }
    };

    const formatMessageContent = (text: string): FormattedContent[] => {
        const codeBlockRegex = /```(ADD|DELETE|highlight-(?:red|green))?\s*(\w+)(?:\s+(?:snippet_id:)?(\d+))?\n([\s\S]*?)```/g;
        const parts: FormattedContent[] = [];
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
            }

            const [, action, language, snippetId, code] = match;
            
            parts.push({
                type: 'code',
                content: code.trim(),
                language: language || 'plaintext',
                snippetId: snippetId || 'new',
                action: action as 'ADD' | 'DELETE' | undefined,
                highlights: action?.startsWith('highlight-') ? [{ start: 1, end: code.trim().split('\n').length, color: action.split('-')[1] as 'red' | 'green' }] : []
            });

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push({ type: 'text', content: text.slice(lastIndex) });
        }

        return parts;
    };

    const processCodeChanges = (content: string) => {
        console.log("Processing code changes:", content);

        const codeBlockRegex = /```(ADD|DELETE|highlight-(?:red|green))?\s*(\w+)(?:\s+(?:snippet_id:)?(\d+))?\n([\s\S]*?)```/g;
        const snippetChanges: { [key: string]: CodeChange[] } = {};
        const snippetKeys = Object.keys(snippets);

        let match;
        while ((match = codeBlockRegex.exec(content)) !== null) {
            console.log("Found code block:", match);
            const [, action, language, snippetId, code] = match;
            const lines = code.trim().split('\n');
            console.log("Parsed lines:", lines);

            let targetSnippetId: string;

            if (snippetId) {
                targetSnippetId = snippetId;
            } else if (snippetKeys.length === 1) {
                targetSnippetId = snippetKeys[0];
            } else {
                targetSnippetId = Date.now().toString();
            }

            if (!snippetChanges[targetSnippetId]) {
                snippetChanges[targetSnippetId] = [];
            }

            snippetChanges[targetSnippetId].push({
                type: action ? (action.startsWith('highlight') ? 'HIGHLIGHT' : action as 'ADD' | 'DELETE') : 'ADD',
                content: code.trim(),
                language: language,
                color: action?.startsWith('highlight') ? action.split('-')[1] as 'red' | 'green' : undefined
            });
        }

        Object.entries(snippetChanges).forEach(([snippetId, changes]) => {
            if (snippets[snippetId]) {
                const updatedContent = applyChangesToContent(snippets[snippetId].content, changes);
                updateSnippet(snippetId, {
                    content: updatedContent,
                    language: changes[0].language || snippets[snippetId].language
                });
            } else {
                const newSnippet = {
                    name: `New Code Snippet ${snippetId}`,
                    content: applyChangesToContent('', changes),
                    language: changes[0].language || detectLanguage(changes[0].content),
                };
                addSnippet(newSnippet);
                setInputSnippets(prev => [...prev, snippetId]);
            }
        });
    };

    const applyChangesToContent = (content: string, changes: CodeChange[]): string => {
        let lines = content.split('\n');
        changes.forEach(change => {
            switch (change.type) {
                case 'ADD':
                    lines = lines.concat(change.content.split('\n'));
                    break;
                case 'DELETE':
                    lines = lines.filter(line => !change.content.includes(line));
                    break;
                case 'HIGHLIGHT':
                    // Highlighting doesn't modify the content
                    break;
            }
        });
        return lines.join('\n');
    };

    const sendMessage = async () => {
        if (!input.trim() && inputSnippets.length === 0) return;

        let apiMessageText = input;
        const usedSnippetIds = new Set<string>();

        // Function to format a single snippet for API message
        const formatSnippetForApi = (snippetId: string) => {
            const snippet = snippets[snippetId];
            if (snippet && !usedSnippetIds.has(snippetId)) {
                usedSnippetIds.add(snippetId);
                const numberedContent = snippet.content.split('\n').map((line, index) => `${index + 1}${line}`).join('\n');
                return `Snippet ${snippetId} ("${snippet.name}"):\n${numberedContent}\n\n`;
            }
            return '';
        };

        // Add snippets that are explicitly referenced in the input
        apiMessageText = apiMessageText.replace(/\[Code Snippet (\w+)\]/g, (match, snippetId) => {
            return formatSnippetForApi(snippetId);
        });

        // Add any remaining snippets from inputSnippets that weren't already included
        inputSnippets.forEach(snippetId => {
            if (!usedSnippetIds.has(snippetId)) {
                apiMessageText += formatSnippetForApi(snippetId);
            }
        });

        const userMessage: Message = { 
            text: input.trim(),
            isUser: true,
            snippets: Array.from(usedSnippetIds)
        };

        const aiMessage: Message = {
            text: '',
            isUser: false,
            snippets: [],
            formattedContent: []
        };

        const newMessages = [...messages, userMessage, aiMessage];
        const newApiMessages = [...apiMessages, { role: 'user', content: apiMessageText.trim() }];

        updateAgentMessages(newMessages, newApiMessages);
        setInput('');
        setInputSnippets([]);
        setIsLoading(true);
        setAgentGeneratingStatus(true);

        try {
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: newApiMessages }),
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let streamedText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                streamedText += chunk;

                console.log("Received chunk:", chunk);

                // Process code changes for each complete message
                if (streamedText.includes('```') && streamedText.split('```').length % 2 === 1) {
                    processCodeChanges(streamedText);
                }

                updateAgentMessages(
                    newMessages.map((msg, index) => 
                        index === newMessages.length - 1 
                            ? { ...msg, text: streamedText, formattedContent: formatMessageContent(streamedText) }
                            : msg
                    ),
                    [...newApiMessages, { role: 'assistant', content: streamedText }]
                );
            }
        } catch (error) {
            console.error('Error sending message:', error);
            updateAgentMessages(
                newMessages.map((msg, index) => 
                    index === newMessages.length - 1 
                        ? { ...msg, text: 'Error: Could not get response from AI', formattedContent: [{ type: 'text', content: 'Error: Could not get response from AI' }] }
                        : msg
                ),
                newApiMessages
            );
        } finally {
            setIsLoading(false);
            setAgentGeneratingStatus(false);
        }
    };

    useEffect(() => {
        setProcessedMessages(processMessages(messages));
    }, [messages]);

    return (
        <div className={`chat-interface ${agentName.toLowerCase()}-theme`}>
            <div className="chat-messages">
                {processedMessages.map((message, index) => (
                    <div key={index} className={`message ${message.isUser ? 'user' : 'ai'}`}>
                        {formatMessage(message)}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="chat-input-form">
                <div className="snippet-indicators">
                    {inputSnippets.map((snippetId) => (
                        snippets[snippetId] && (
                            <div key={snippetId} className="snippet-indicator">
                                <button
                                    onClick={() => handleSnippetButtonClick(snippetId)}
                                    className="snippet-button"
                                >
                                    <CodeIcon />
                                    <span>{snippets[snippetId].name}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteSnippet(snippetId)}
                                    className="delete-snippet-button"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        )
                    ))}
                </div>
                <div className="chat-input-wrapper">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={getPlaceholder()}
                        className="chat-input"
                    />
                    <button type="submit" className="chat-submit" disabled={isLoading}>
                        {isLoading ? (
                            <span className="loading-indicator">...</span>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatInterface;