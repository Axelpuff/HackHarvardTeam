import { create } from 'zustand';

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  text: string;
}

interface ConversationState {
  // Conversation flow state
  isConversationActive: boolean;
  conversationMode: 'none' | 'text' | 'audio';
  messages: ConversationMessage[];
  clarifications: string[];
  problemText: string;
  pendingInput: string;

  // Request/response state
  isRequesting: boolean;
  isSpeaking: boolean;

  // Proposal state
  hasProposal: boolean;
  lastProposal: any | null;

  // Apply/undo state
  isApplying: boolean;
  applyError: string | null;
  applySuccess: string | null;
  lastAppliedChangeIds: string[] | null;

  // Export state
  isExporting: boolean;

  // UI state
  isDarkMode: boolean;
}

interface ConversationActions {
  // Conversation flow actions
  setIsConversationActive: (active: boolean) => void;
  setConversationMode: (mode: 'none' | 'text' | 'audio') => void;
  addMessage: (message: ConversationMessage) => void;
  setMessages: (messages: ConversationMessage[]) => void;
  addClarification: (clarification: string) => void;
  setClarifications: (clarifications: string[]) => void;
  setProblemText: (text: string) => void;
  setPendingInput: (input: string) => void;

  // Request/response actions
  setIsRequesting: (requesting: boolean) => void;
  setIsSpeaking: (speaking: boolean) => void;

  // Proposal actions
  setHasProposal: (hasProposal: boolean) => void;
  setLastProposal: (proposal: any | null) => void;

  // Apply/undo actions
  setIsApplying: (applying: boolean) => void;
  setApplyError: (error: string | null) => void;
  setApplySuccess: (success: string | null) => void;
  setLastAppliedChangeIds: (ids: string[] | null) => void;

  // Export actions
  setIsExporting: (exporting: boolean) => void;

  // UI actions
  setIsDarkMode: (darkMode: boolean) => void;

  // Reset actions
  resetConversation: () => void;
  resetApplyState: () => void;
}

const initialState: ConversationState = {
  isConversationActive: false,
  conversationMode: 'none',
  messages: [
    {
      role: 'system',
      text: "Hi! I'm here to help you optimize your schedule. What scheduling challenge are you facing?",
    },
  ],
  clarifications: [],
  problemText: '',
  pendingInput: '',
  isRequesting: false,
  isSpeaking: false,
  hasProposal: false,
  lastProposal: null,
  isApplying: false,
  applyError: null,
  applySuccess: null,
  lastAppliedChangeIds: null,
  isExporting: false,
  isDarkMode: false,
};

export const useConversationStore = create<
  ConversationState & ConversationActions
>((set) => ({
  ...initialState,

  // Conversation flow actions
  setIsConversationActive: (active) => set({ isConversationActive: active }),
  setConversationMode: (mode) => set({ conversationMode: mode }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  addClarification: (clarification) =>
    set((state) => ({
      clarifications: [...state.clarifications, clarification],
    })),
  setClarifications: (clarifications) => set({ clarifications }),
  setProblemText: (text) => set({ problemText: text }),
  setPendingInput: (input) => set({ pendingInput: input }),

  // Request/response actions
  setIsRequesting: (requesting) => set({ isRequesting: requesting }),
  setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),

  // Proposal actions
  setHasProposal: (hasProposal) => set({ hasProposal }),
  setLastProposal: (proposal) => set({ lastProposal: proposal }),

  // Apply/undo actions
  setIsApplying: (applying) => set({ isApplying: applying }),
  setApplyError: (error) => set({ applyError: error }),
  setApplySuccess: (success) => set({ applySuccess: success }),
  setLastAppliedChangeIds: (ids) => set({ lastAppliedChangeIds: ids }),

  // Export actions
  setIsExporting: (exporting) => set({ isExporting: exporting }),

  // UI actions
  setIsDarkMode: (darkMode) => set({ isDarkMode: darkMode }),

  // Reset actions
  resetConversation: () =>
    set({
      isConversationActive: false,
      conversationMode: 'none',
      messages: initialState.messages,
      clarifications: [],
      problemText: '',
      pendingInput: '',
      isRequesting: false,
      hasProposal: false,
      lastProposal: null,
    }),

  resetApplyState: () =>
    set({
      isApplying: false,
      applyError: null,
      applySuccess: null,
    }),
}));
