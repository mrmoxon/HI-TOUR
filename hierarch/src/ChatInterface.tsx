import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import axios from 'axios';

interface Message {
  text: string;
  isUser: boolean;
  snippets: { id: number; code: string }[];
}

interface ChatInterfaceProps {
    onCodeDetected: (code: string) => void;
    onSnippetButtonClick: (snippetId: number) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onCodeDetected, onSnippetButtonClick }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');

    const [inputSnippets, setInputSnippets] = useState<{ id: number; code: string }[]>([]);

    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    //     const pastedText = e.clipboardData.getData('text');
    //     if (detectCode(pastedText)) {
    //         e.preventDefault();
    //         const snippetId = onCodeDetected(pastedText);
    //         setInputSnippets(prev => [...prev, { id: snippetId, code: pastedText }]);
    //         setInput(prev => prev + `[Code Snippet ${snippetId}]`);
    //     }
    // };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (detectCode(pastedText)) {
          e.preventDefault();
          const snippetId = onCodeDetected(pastedText);
          setInputSnippets(prev => [...prev, { id: snippetId, code: pastedText }]);
        }
      };
    
    // const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    //     if (e.key === 'Enter' && e.shiftKey) {
    //       e.preventDefault();
    //       setInput(prev => prev + '\n');
    //     } else if (e.key === 'Enter' && !e.shiftKey) {
    //       e.preventDefault();
    //       sendMessage();
    //     }
    //   };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
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

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setInputSnippets([]);

        try {
            // Prepare the message for the API call
            const apiMessage = messageText + '\n\n' + snippets.map((s, index) => 
                `Snippet ${index + 1}:\n${s.code}`
            ).join('\n\n');

            const response = await axios.post('http://localhost:5000/api/chat', { 
                message: apiMessage
            });
            const aiMessage: Message = { 
                text: response.data.response, 
                isUser: false,
                snippets: []  // AI responses don't have snippets for now
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = { 
                text: 'Error: Could not get response from AI', 
                isUser: false,
                snippets: []
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };
      
    const CodeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      );
    
      const formatMessage = (text: string, snippets: { id: number; code: string }[]) => {
        const words = text.split(' ');
        return (
          <>
            <div className="message-text">
              {words.map((word, index) => {
                if (word.length > 65) {
                  return <span key={index} className="long-word">{word}</span>;
                }
                return word + ' ';
              })}
            </div>
            {snippets.length > 0 && (
              <div className="snippet-references">
                {snippets.map((snippet, index) => (
                  <button
                    key={snippet.id}
                    onClick={() => onSnippetButtonClick(snippet.id)}
                    className="snippet-reference-button"
                  >
                    <CodeIcon />
                    <span>Snippet {index + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        );
      };
                
    return (
        <div className="chat-interface">
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.isUser ? 'user' : 'ai'}`}>
              {formatMessage(message.text, message.snippets)}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="chat-input-form">
            <div className="snippet-indicators">
            {inputSnippets.map((snippet, index) => (
                <div
                key={snippet.id}
                className="snippet-indicator"
                onClick={() => onSnippetButtonClick(snippet.id)}
                >
                <CodeIcon />
                <span>Snippet {index + 1}</span>
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
                placeholder="Type your message..."
                className="chat-input"
            />
            <button type="submit" className="chat-submit">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
            </button>
            </div>
        </form>
    </div>
    );
  };
          
export default ChatInterface;
