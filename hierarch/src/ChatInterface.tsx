import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Message {
  text: string;
  isUser: boolean;
}

interface ChatInterfaceProps {
    onCodeDetected: (code: string) => void;
}
  
const ChatInterface: React.FC<ChatInterfaceProps> = ({ onCodeDetected }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    useEffect(scrollToBottom, [messages]);

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

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (detectCode(pastedText)) {
            e.preventDefault();
            onCodeDetected(pastedText);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
  
      const userMessage: Message = { text: input, isUser: true };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
  
      try {
        const response = await axios.post('http://localhost:5000/api/chat', { message: input });
        const aiMessage: Message = { text: response.data.response, isUser: false };
        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage: Message = { text: 'Error: Could not get response from AI', isUser: false };
        setMessages(prev => [...prev, errorMessage]);
      }
    };
  
    const formatMessage = (text: string) => {
        const words = text.split(' ');
        return words.map((word, index) => {
          if (word.length > 65) {
            return <span key={index} className="long-word">{word}</span>;
          }
          return word + ' ';
        });
      };
    
    return (
      <div className="chat-interface">
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.isUser ? 'user' : 'ai'}`}>
              {message.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={sendMessage} className="chat-input-form">
          <div className="chat-input-wrapper">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
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