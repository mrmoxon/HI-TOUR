// ChatInterface.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
    text: string;
    isUser: boolean;
    snippets: { id: number; code: string }[];
    formattedContent?: FormattedContent[];
  }
  
interface ChatInterfaceProps {
    onCodeDetected: (code: string) => number;
    onSnippetButtonClick: (snippetId: number) => void;
    onSnippetDelete: (snippetId: number) => void;
    deletedSnippets: number[];
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
}
  
interface ApiMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
  
const ChatInterface: React.FC<ChatInterfaceProps> = ({
    onCodeDetected,
    onSnippetButtonClick,
    onSnippetDelete,
    deletedSnippets,
    systemPrompt,
    agentName,
    messages,
    apiMessages,
    updateAgentMessages,
    setAgentGeneratingStatus
}) => {
    const [input, setInput] = useState('');
    const [inputSnippets, setInputSnippets] = useState<{ id: number; code: string }[]>([]);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    useEffect(scrollToBottom, [messages]);

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

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (detectCode(pastedText)) {
          e.preventDefault();
          const snippetId = onCodeDetected(pastedText);
          setInputSnippets(prev => [...prev, { id: snippetId, code: pastedText }]);
        }
    };
        
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
    };
    
    const handleDeleteSnippet = (snippetId: number) => {
        onSnippetDelete(snippetId);
        setInputSnippets(prev => prev.filter(snippet => snippet.id !== snippetId));
    };
      
    const CodeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
    );
    
    const formatMessageContent = (text: string): FormattedContent[] => {
        const codeBlockRegex = /```([\+\-]?)(\w+)?\n([\s\S]*?)```/g;
        const parts: FormattedContent[] = [];
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
            }

            const [, actionSymbol, language, code] = match;
            const action = actionSymbol === '+' ? 'ADD' : actionSymbol === '-' ? 'DELETE' : undefined;

            parts.push({
                type: 'code',
                content: code.trim(),
                language: language || 'plaintext',
                action
            });

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push({ type: 'text', content: text.slice(lastIndex) });
        }

        return parts;
    };

    const CodeBlock: React.FC<{ content: string; language: string; action?: 'ADD' | 'DELETE' }> = ({ content, language, action }) => (
        <div className="code-block">
            <div className="code-block-header">
                <span className="language-label">{language}</span>
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
                    backgroundColor: '#1e1e1e',
                    margin: 0,
                    borderBottomLeftRadius: '5px',
                    borderBottomRightRadius: '5px',
                }}
            >
                {content}
            </SyntaxHighlighter>
        </div>
    );

    const formatMessage = (text: string, snippets: { id: number; code: string }[]) => {
        const formattedContent = formatMessageContent(text);
        return (
          <>
            {formattedContent.map((part, index) => 
                part.type === 'code' ? (
                    <SyntaxHighlighter
                        key={index}
                        language={part.language}
                        style={vscDarkPlus}
                        customStyle={{
                            backgroundColor: '#1e1e1e',
                            padding: '1em',
                            borderRadius: '5px',
                            margin: '0.5em 0'
                        }}
                    >
                        {part.content}
                    </SyntaxHighlighter>
                ) : (
                    <span key={index}>{part.content}</span>
                )
            )}
            {snippets.length > 0 && (
              <div className="snippet-references">
                {snippets.map((snippet, index) => (
                  deletedSnippets.includes(snippet.id) ? (
                    <span key={snippet.id} className="deleted-snippet-reference">
                      <CodeIcon />
                      <span>deleted</span>
                    </span>
                  ) : (
                    <button
                      key={snippet.id}
                      onClick={() => onSnippetButtonClick(snippet.id)}
                      className="snippet-reference-button"
                    >
                      <CodeIcon />
                      <span>Snippet {index + 1}</span>
                    </button>
                  )
                ))}
              </div>
            )}
          </>
        );
    };

    const sendMessage = async () => {
        if (!input.trim() && inputSnippets.length === 0) return;

        let messageText = input;
        const snippets = [...inputSnippets];

        snippets.forEach((snippet, index) => {
            messageText = messageText.replace(`[Code Snippet ${snippet.id}]`, `Snippet ${index + 1}`);
        });

        const userMessage: Message = { 
            text: messageText, 
            isUser: true,
            snippets: snippets
        };

        const aiMessage: Message = {
            text: '',
            isUser: false,
            snippets: [],
            formattedContent: []
        };

        const newMessages = [...messages, userMessage, aiMessage];
        const newApiMessages = [...apiMessages, { role: 'user', content: messageText + '\n\n' + snippets.map((s, index) => 
            `Snippet ${index + 1}:\n${s.code}`
        ).join('\n\n') }];

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
        console.log('Messages state updated:', messages);
    }, [messages]);

    return (
        <div className={`chat-interface ${agentName.toLowerCase()}-theme`}>
            <div className="chat-messages">
                {messages.map((message, index) => (
                    <div key={index} className={`message ${message.isUser ? 'user' : 'ai'}`}>
                        {message.formattedContent ? 
                            message.formattedContent.map((part, partIndex) => 
                                part.type === 'code' ? (
                                    <CodeBlock
                                        key={partIndex}
                                        content={part.content}
                                        language={part.language}
                                        action={part.action}
                                    />
                                ) : (
                                    <span key={partIndex}>{part.content}</span>
                                )
                            )
                            : formatMessage(message.text, message.snippets)
                        }
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="chat-input-form">
                <div className="snippet-indicators">
                    {inputSnippets.map((snippet, index) => (
                        <div key={snippet.id} className="snippet-indicator">
                            <button
                                onClick={() => onSnippetButtonClick(snippet.id)}
                                className="snippet-button"
                            >
                                <CodeIcon />
                                <span>Snippet</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteSnippet(snippet.id)}
                                className="delete-snippet-button"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
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
