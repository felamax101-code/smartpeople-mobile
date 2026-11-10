// shareStore.ts
import { create } from "zustand";

type ShareState = {
  link: string | null;
  enteredMessages: boolean; // has the user reached the messages area yet?
  startShare: (link: string) => void;
  markEntered: () => void;
  clearShare: () => void;
};

export const useShareStore = create<ShareState>((set) => ({
  link: null,
  enteredMessages: false,
  startShare: (link) => set({ link, enteredMessages: false }),
  markEntered: () => set({ enteredMessages: true }),
  clearShare: () => set({ link: null, enteredMessages: false }),
}));