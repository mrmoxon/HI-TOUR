import React, { useState, useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
// Import other languages as needed

interface CodeBlockProps {
  code: string;
  language: string;
  isEditable: boolean;
  onCodeChange: (newCode: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, isEditable, onCodeChange }) => {
  const [editableCode, setEditableCode] = useState(code);
  const codeRef = useRef<HTMLElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditableCode(code);
  }, [code]);

  useEffect(() => {
    updateLineNumbers();
    highlightCode();
  }, [editableCode, language, isEditable]);

  const highlightCode = () => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  };

  const handleCodeChange = () => {
    if (codeRef.current) {
      const newCode = codeRef.current.textContent || '';
      setEditableCode(newCode);
      onCodeChange(newCode);
    }
  };

  const updateLineNumbers = () => {
    if (lineNumbersRef.current && codeRef.current) {
      const lineCount = (codeRef.current.textContent || '').split('\n').length;
      lineNumbersRef.current.innerHTML = Array(lineCount)
        .fill(0)
        .map((_, i) => `<span>${i + 1}</span>`)
        .join('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
  };

  return (
    <div className="code-block-container">
      <div className="line-numbers" ref={lineNumbersRef}></div>
      <pre className={`language-${language} code-block ${isEditable ? 'editable' : ''}`}>
        <code
          ref={codeRef}
          contentEditable={isEditable}
          onInput={handleCodeChange}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning={true}
          spellCheck={false}
        >
          {editableCode}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;