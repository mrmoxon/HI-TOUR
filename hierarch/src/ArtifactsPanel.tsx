import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSnippets } from './SnippetContext.tsx';
import { useSnippetManager } from './SnippetManager.tsx';
import ReactMarkdown from 'react-markdown';

import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { markdown } from '@codemirror/lang-markdown';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

import { highlightSpecialChars, drawSelection, highlightActiveLine } from '@codemirror/view';
import { Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';

interface ArtifactsPanelProps {
    fontSize: number;
}

interface HighlightInfo {
    start: number;
    end: number;
    color: 'red' | 'green';
}

interface CodeChange {
    type: 'ADD' | 'DELETE' | 'HIGHLIGHT';
    start: number;
    end: number;
    content?: string;
    color?: 'red' | 'green';
  }
  
  class DeletedLineWidget extends WidgetType {
    constructor(readonly content: string) { super() }
  
    toDOM() {
      let wrap = document.createElement("div")
      wrap.className = "cm-deleted-line"
      wrap.textContent = this.content
      return wrap
    }
  }
  
  class DeletedLinesWidget extends WidgetType {
    constructor(readonly lines: string[]) { super() }
  
    toDOM() {
      let wrap = document.createElement("details")
      wrap.className = "cm-deleted-lines"
      let summary = wrap.appendChild(document.createElement("summary"))
      summary.textContent = `${this.lines.length} line${this.lines.length > 1 ? 's' : ''} deleted`
      let content = wrap.appendChild(document.createElement("div"))
      this.lines.forEach(line => {
        let lineElem = content.appendChild(document.createElement("div"))
        lineElem.className = "cm-deleted-line"
        lineElem.textContent = line
      })
      return wrap
    }
  }
  
const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({ fontSize }) => {
    const { state, dispatch } = useSnippets();
    const { /* ... */ } = useSnippets();
    const { snippets, addSnippet, updateSnippet, /* ... */ } = useSnippetManager();
    
    const [tabs, setTabs] = useState<string[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [editingTabId, setEditingTabId] = useState<string | null>(null);

    const editorsRef = useRef<{[key: string]: EditorView}>({});
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

    const addHighlight = StateEffect.define<CodeChange>();
    const removeHighlight = StateEffect.define<number>();

    const addLine = StateEffect.define<CodeChange>();
    const deleteLine = StateEffect.define<CodeChange>();

    useEffect(() => {
        const snippetIds = Object.keys(snippets);
        setTabs(prevTabs => {
            const newTabs = prevTabs.filter(id => snippetIds.includes(id));
            const addedTabs = snippetIds.filter(id => !prevTabs.includes(id));
            return [...newTabs, ...addedTabs];
        });
        
        if (activeTabId && !snippetIds.includes(activeTabId)) {
            setActiveTabId(snippetIds[snippetIds.length - 1] || null);
        }
    }, [snippets, activeTabId]);

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

    const createNewTab = () => {
        const newSnippet = {
            id: Date.now().toString(),
            content: '',
            type: 'markdown' as const,
            name: 'New Snippet',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        dispatch({ type: 'ADD_SNIPPET', payload: newSnippet });
        setActiveTabId(newSnippet.id);
        
        setTimeout(() => {
            if (tabsContainerRef.current) {
                tabsContainerRef.current.scrollLeft = tabsContainerRef.current.scrollWidth;
            }
        }, 0);
    };

    const getLanguageExtension = (type: string, language?: string) => {
        if (type === 'markdown') return markdown();
        switch (language?.toLowerCase()) {
            case 'javascript':
            case 'typescript':
                return javascript();
            case 'python':
                return python();
            case 'java':
                return java();
            default:
                return javascript();
        }
    };

    const detectLanguage = (code: string): string => {
        if (code.includes('class') || code.includes('interface')) return 'typescript';
        if (code.includes('func') || code.includes('let')) return 'swift';
        if (code.includes('def') || code.includes('print(')) return 'python';
        if (code.includes('package') || code.includes('public class')) return 'java';
        return 'javascript'; // Default to JavaScript
    };

    const createEditor = useCallback((snippetId: string) => {
        console.log("Creating editor for snippet:", snippetId);
        const snippet = snippets[snippetId];
        const editorElement = document.getElementById(`editor-${snippetId}`);
        if (editorElement) {
            if (editorsRef.current[snippetId]) {
                editorsRef.current[snippetId].destroy();
            }

            const startState = EditorState.create({
                doc: snippet.content,
                extensions: [
                    basicSetup,
                    getLanguageExtension(snippet.type, snippet.language),
                    vscodeDark,
                    highlightSpecialChars(),
                    drawSelection(),
                    highlightActiveLine(),
                    changesField,
                    EditorView.updateListener.of(update => {
                        if (update.docChanged) {
                            const newContent = update.state.doc.toString();
                            dispatch({
                                type: 'UPDATE_SNIPPET',
                                payload: { 
                                    id: snippetId, 
                                    updates: { 
                                        content: newContent,
                                        updatedAt: new Date()
                                    } 
                                }
                            });
                        }
                    }),
                    EditorView.theme({
                        "&": { fontSize: `${fontSize}px` },
                        ".cm-scroller": { overflow: "auto" },
                        ".cm-content": { 
                            padding: "10px",
                            backgroundColor: snippet.type === 'markdown' ? 'white' : undefined,
                            color: snippet.type === 'markdown' ? 'black' : undefined,
                            maxWidth: '100%',
                            boxSizing: 'border-box'
                        },
                        "&.cm-focused": { outline: "none" },
                        ".cm-line": { 
                            fontFamily: snippet.type === 'markdown' ? 'Times New Roman, serif' : 'monospace',
                            whiteSpace: snippet.type === 'markdown' ? 'pre-wrap' : 'pre',
                            wordWrap: snippet.type === 'markdown' ? 'break-word' : 'normal',
                            overflowWrap: snippet.type === 'markdown' ? 'break-word' : 'normal',
                            overflowX: snippet.type === 'code' ? 'auto' : 'hidden'
                        },
                        ".cm-highlight-red": { 
                            backgroundColor: "rgba(255, 0, 0, 0.2)" 
                        },
                        ".cm-highlight-green": { 
                            backgroundColor: "rgba(0, 255, 0, 0.466)" 
                        },
                        ".cm-added-line": { 
                            backgroundColor: "rgba(0, 255, 0, 0.1)" 
                        },
                        ".cm-deleted-line": { 
                            backgroundColor: "rgba(255, 0, 0, 0.1)",
                            textDecoration: "line-through",
                            color: "#888"
                        },
                        ".cm-deleted-lines": { 
                            borderLeft: "2px solid red",
                            paddingLeft: "5px",
                            marginLeft: "-7px"
                        },
                        ".cm-deleted-lines summary": { 
                            cursor: "pointer",
                            color: "red",
                            fontStyle: "italic"
                        }
                    })
                ]
            });

            const view = new EditorView({
                state: startState,
                parent: editorElement
            });

            editorsRef.current[snippetId] = view;

            // Apply changes if they exist
            if (snippet.changes) {
                console.log("Applying changes for snippet:", snippetId, snippet.changes);
                let newContent = snippet.content;
                const addedLines: {[key: number]: string} = {};

                snippet.changes.forEach((change) => {
                    switch (change.type) {
                        case 'HIGHLIGHT':
                            view.dispatch({
                                effects: addHighlight.of(change)
                            });
                            break;
                        case 'ADD':
                            if (change.start > view.state.doc.lines) {
                                // If we're adding beyond the current document, store for later
                                addedLines[change.start] = change.content;
                            } else {
                                const lineStart = view.state.doc.line(change.start).from;
                                view.dispatch({
                                    changes: {from: lineStart, insert: change.content + '\n'},
                                    effects: addLine.of({...change, end: change.start + 1})
                                });
                            }
                            break;
                        case 'DELETE':
                            view.dispatch({
                                effects: deleteLine.of(change)
                            });
                            break;
                    }
                });

                // Append any lines that were meant to be added beyond the document's end
                if (Object.keys(addedLines).length > 0) {
                    const sortedLines = Object.entries(addedLines).sort(([a], [b]) => parseInt(a) - parseInt(b));
                    const insertContent = '\n' + sortedLines.map(([, content]) => content).join('\n');
                    
                    view.dispatch({
                        changes: {from: view.state.doc.length, insert: insertContent},
                        effects: sortedLines.map(([lineNum, content], index) => addLine.of({
                            type: 'ADD',
                            start: view.state.doc.lines + index + 1,
                            end: view.state.doc.lines + index + 2,
                            content: content
                        }))
                    });

                    newContent += insertContent;
                }

                // Update the snippet content if we added lines
                if (newContent !== snippet.content) {
                    dispatch({
                        type: 'UPDATE_SNIPPET',
                        payload: { 
                            id: snippetId, 
                            updates: { 
                                content: newContent,
                                updatedAt: new Date()
                            } 
                        }
                    });
                }
            }
        }
    }, [fontSize, snippets, dispatch]);

    useEffect(() => {
        tabs.forEach(createEditor);

        return () => {
            Object.values(editorsRef.current).forEach(editor => editor.destroy());
            editorsRef.current = {};
        };
    }, [tabs, createEditor]);

    const handleTabClick = (tabId: number) => {
        setActiveTabId(tabId);
    };

    useEffect(() => {
        console.log("Snippets updated:", snippets);
        Object.keys(snippets).forEach((snippetId) => {
            const editor = editorsRef.current[snippetId];
            const snippet = snippets[snippetId];
            if (editor && snippet.highlights) {
                console.log("Updating highlights for snippet:", snippetId, snippet.highlights);
                editor.dispatch({
                    effects: snippet.highlights.map(highlight => addHighlight.of(highlight))
                });
            }
        });
    }, [snippets]);

    // Update handleDeleteTab to dispatch the delete action
    const handleDeleteTab = (tabId: string) => {
        dispatch({ type: 'DELETE_SNIPPET', payload: tabId });
        setTabs(prevTabs => prevTabs.filter(id => id !== tabId));
        if (activeTabId === tabId) {
            setActiveTabId(tabs[tabs.length - 2] || null);
        }
    };

    const handleRenameTab = (tabId: string) => {
        setEditingTabId(tabId);
        setTimeout(() => {
            if (renameInputRef.current) {
                renameInputRef.current.focus();
                renameInputRef.current.select();
            }
        }, 0);
    };

    const handleRenameInputChange = (e: React.ChangeEvent<HTMLInputElement>, tabId: string) => {
        const newName = e.target.value;
        dispatch({
            type: 'UPDATE_SNIPPET',
            payload: { 
                id: tabId, 
                updates: { 
                    name: newName,
                    updatedAt: new Date()
                } 
            }
        });
    };

    const handleRenameInputBlur = () => {
        setEditingTabId(null);
    };

    const handleRenameInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setEditingTabId(null);
        }
    };



    // Highlighting

    const changesField = StateField.define<DecorationSet>({
        create() {
            return Decoration.none;
        },
        update(changes, tr) {
            changes = changes.map(tr.changes);
            for (let e of tr.effects) {
                if (e.is(addHighlight)) {
                    console.log("Adding highlight:", e.value);
                    const from = tr.state.doc.line(Math.min(e.value.start, tr.state.doc.lines)).from;
                    const to = tr.state.doc.line(Math.min(e.value.end, tr.state.doc.lines)).to;
                    if (from < to) {
                        changes = changes.update({
                            add: [highlightDecoration(e.value.color).range(from, to)]
                        });
                    }
                } else if (e.is(addLine)) {
                    console.log("Adding line:", e.value);
                    let from, to;
                    if (e.value.start > tr.state.doc.lines) {
                        // If we're adding beyond the current document, append at the end
                        from = to = tr.state.doc.length;
                    } else {
                        from = tr.state.doc.line(e.value.start).from;
                        to = tr.state.doc.line(Math.min(e.value.end, tr.state.doc.lines)).to;
                    }
                    if (from < to) {
                        changes = changes.update({
                            add: [Decoration.mark({ class: "cm-added-line" }).range(from, to)]
                        });
                    }
                } else if (e.is(deleteLine)) {
                    console.log("Deleting line:", e.value);
                    const from = tr.state.doc.line(Math.min(e.value.start, tr.state.doc.lines)).from;
                    const to = tr.state.doc.line(Math.min(e.value.end, tr.state.doc.lines)).to;
                    if (from < to) {
                        changes = changes.update({
                            add: [Decoration.replace({
                                widget: new DeletedLineWidget(e.value.content),
                                inclusive: true
                            }).range(from, to)]
                        });
                    }
                }
            }
            return changes;
        },
        provide: f => EditorView.decorations.from(f)
    });

    const highlightField = StateField.define<DecorationSet>({
        create() {
            return Decoration.none;
        },
        update(highlights, tr) {
            highlights = highlights.map(tr.changes);
            for (let e of tr.effects) {
                if (e.is(addHighlight)) {
                    console.log("Adding highlight:", e.value);
                    highlights = highlights.update({
                        add: [highlightDecoration(e.value.color).range(
                            tr.state.doc.line(e.value.start).from,
                            tr.state.doc.line(e.value.end).to
                        )]
                    });
                }
            }
            return highlights;
        },
        provide: f => EditorView.decorations.from(f)
    });

    const highlightDecoration = (color: 'red' | 'green') => Decoration.mark({
        class: `cm-highlight-${color}`
    });

    const addedLineDecoration = Decoration.line({
        class: "cm-added-line"
    });

    useEffect(() => {
        tabs.forEach(createEditor);

        return () => {
            Object.values(editorsRef.current).forEach(editor => editor.destroy());
            editorsRef.current = {};
        };
    }, [tabs, createEditor]);

    // Function to update highlights
    const updateHighlights = (snippetId: string, newHighlights: HighlightInfo[]) => {
        const editor = editorsRef.current[snippetId];
        if (editor) {
            // Remove all existing highlights
            editor.dispatch({
                effects: editor.state.field(highlightField).size ? 
                    [EditorView.scrollIntoView(0), removeHighlight.of(0)] : []
            });

            // Add new highlights
            newHighlights.forEach((highlight, index) => {
                editor.dispatch({
                    effects: addHighlight.of({...highlight, id: index})
                });
            });
        }
    };

    return (
        <div className="artifacts-panel">
            <div className="tabs-container" ref={tabsContainerRef}>
                <div className="tabs">
                    {tabs.map((tabId) => (
                        snippets[tabId] && (                        
                        <div key={tabId} className="tab-wrapper">
                            {editingTabId === tabId ? (
                                <input
                                    ref={renameInputRef}
                                    value={snippets[tabId].name}
                                    onChange={(e) => handleRenameInputChange(e, tabId)}
                                    onBlur={handleRenameInputBlur}
                                    onKeyDown={handleRenameInputKeyDown}
                                    className="rename-input"
                                />
                            ) : (
                                <button
                                    className={`tab ${activeTabId === tabId ? 'active' : ''}`}
                                    onClick={() => handleTabClick(tabId)}
                                    onDoubleClick={() => handleRenameTab(tabId)}
                                >
                                    {snippets[tabId].name}
                                </button>
                            )}
                            <button
                                className="delete-tab-button"
                                onClick={() => handleDeleteTab(tabId)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        )
                    ))}
                    <button className="new-tab-button" onClick={createNewTab}>+</button>
                </div>
            </div>
            <div className="tab-content">
                {tabs.map((tabId) => (
                    snippets[tabId] && (
                    <div
                        key={tabId}
                        style={{
                            display: activeTabId === tabId ? 'block' : 'none',
                            height: 'calc(100% - 40px)',
                            border: '1px solid #444',
                            borderRadius: '4px',
                            overflow: snippets[tabId].type === 'code' ? 'auto' : 'hidden'
                        }}
                    >
                        <div
                            id={`editor-${tabId}`}
                            className={`editor ${snippets[tabId].type === 'markdown' ? 'markdown-editor' : 'code-editor'}`}
                            style={{ height: '100%', overflow: 'auto', width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    )
                ))}
            </div>
        </div>
    );
};

export default ArtifactsPanel;