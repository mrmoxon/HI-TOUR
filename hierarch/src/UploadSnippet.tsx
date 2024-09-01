import React, { useState } from 'react';
import { useSnippets } from './SnippetContext';

const UploadSnippet: React.FC = () => {
  const { dispatch } = useSnippets();
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (file) {
      const content = await file.text();
      const newSnippet = {
        id: Date.now().toString(),
        name: file.name,
        content,
        type: file.name.endsWith('.md') ? 'markdown' : 'code',
        language: detectLanguage(file.name),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dispatch({ type: 'ADD_SNIPPET', payload: newSnippet });
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
};

export default UploadSnippet;