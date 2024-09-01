import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Snippet {
  id: string;
  name: string;
  content: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

interface SnippetManagerState {
  snippets: Record<string, Snippet>;
  activeSnippetId: string | null;
}

type SnippetManagerAction =
  | { type: 'ADD_SNIPPET'; payload: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt' | 'version'> }
  | { type: 'UPDATE_SNIPPET'; payload: { id: string; updates: Partial<Snippet> } }
  | { type: 'DELETE_SNIPPET'; payload: string }
  | { type: 'SET_ACTIVE_SNIPPET'; payload: string | null };

const snippetManagerReducer = (state: SnippetManagerState, action: SnippetManagerAction): SnippetManagerState => {
  switch (action.type) {
    case 'ADD_SNIPPET':
      const newId = Date.now().toString();
      return {
        ...state,
        snippets: {
          ...state.snippets,
          [newId]: {
            id: newId,
            ...action.payload,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1
          }
        },
        activeSnippetId: newId
      };
    case 'UPDATE_SNIPPET':
      return {
        ...state,
        snippets: {
          ...state.snippets,
          [action.payload.id]: {
            ...state.snippets[action.payload.id],
            ...action.payload.updates,
            updatedAt: new Date(),
            version: state.snippets[action.payload.id].version + 1
          }
        }
      };
    case 'DELETE_SNIPPET':
      const { [action.payload]: deletedSnippet, ...remainingSnippets } = state.snippets;
      return {
        ...state,
        snippets: remainingSnippets,
        activeSnippetId: state.activeSnippetId === action.payload ? null : state.activeSnippetId
      };
    case 'SET_ACTIVE_SNIPPET':
      return {
        ...state,
        activeSnippetId: action.payload
      };
    default:
      return state;
  }
};

const SnippetManagerContext = createContext<{
  state: SnippetManagerState;
  dispatch: React.Dispatch<SnippetManagerAction>;
} | undefined>(undefined);

export const SnippetManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(snippetManagerReducer, { snippets: {}, activeSnippetId: null });

  return (
    <SnippetManagerContext.Provider value={{ state, dispatch }}>
      {children}
    </SnippetManagerContext.Provider>
  );
};

export const useSnippetManager = () => {
  const context = useContext(SnippetManagerContext);
  if (context === undefined) {
    throw new Error('useSnippetManager must be used within a SnippetManagerProvider');
  }

  const { state, dispatch } = context;

  return {
    snippets: state.snippets,
    activeSnippetId: state.activeSnippetId,
    addSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => 
      dispatch({ type: 'ADD_SNIPPET', payload: snippet }),
    updateSnippet: (id: string, updates: Partial<Snippet>) => 
      dispatch({ type: 'UPDATE_SNIPPET', payload: { id, updates } }),
    deleteSnippet: (id: string) => 
      dispatch({ type: 'DELETE_SNIPPET', payload: id }),
    setActiveSnippet: (id: string | null) => 
      dispatch({ type: 'SET_ACTIVE_SNIPPET', payload: id })
  };
};