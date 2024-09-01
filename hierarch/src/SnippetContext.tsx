import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Snippet {
  id: string;
  name: string;
  content: string;
  type: 'markdown' | 'code';
  language?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SnippetState {
  snippets: Record<string, Snippet>;
  activeSnippetId: string | null;
}

type SnippetAction =
  | { type: 'ADD_SNIPPET'; payload: Snippet }
  | { type: 'UPDATE_SNIPPET'; payload: { id: string; updates: Partial<Snippet> } }
  | { type: 'DELETE_SNIPPET'; payload: string }
  | { type: 'SET_ACTIVE_SNIPPET'; payload: string | null };

const initialState: SnippetState = {
  snippets: {},
  activeSnippetId: null
};

function snippetReducer(state: SnippetState, action: SnippetAction): SnippetState {
  switch (action.type) {
    case 'ADD_SNIPPET':
      return {
        ...state,
        snippets: {
          ...state.snippets,
          [action.payload.id]: action.payload
        }
      };
    case 'UPDATE_SNIPPET':
      return {
        ...state,
        snippets: {
          ...state.snippets,
          [action.payload.id]: {
            ...state.snippets[action.payload.id],
            ...action.payload.updates,
            updatedAt: new Date()
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
}

const SnippetContext = createContext<{
  state: SnippetState;
  dispatch: React.Dispatch<SnippetAction>;
} | undefined>(undefined);

export const SnippetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(snippetReducer, initialState);

  return (
    <SnippetContext.Provider value={{ state, dispatch }}>
      {children}
    </SnippetContext.Provider>
  );
};

export function useSnippets() {
  const context = useContext(SnippetContext);
  if (context === undefined) {
    throw new Error('useSnippets must be used within a SnippetProvider');
  }
  return context;
}
