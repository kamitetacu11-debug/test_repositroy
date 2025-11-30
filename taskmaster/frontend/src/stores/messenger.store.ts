import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  email?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
  teamId?: string; // Team the user belongs to
}

export interface Team {
  id: string;
  name: string;
  description?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'document';
  name: string;
  url: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string; // Encrypted content
  decryptedContent?: string; // For display
  attachments: Attachment[];
  replyToId?: string;
  isEdited: boolean;
  isDeleted: boolean;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  id: string;
  type: 'private' | 'group';
  name?: string; // For group chats
  avatar?: string;
  participants: User[];
  adminIds?: string[]; // For group chats
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Encryption utilities using Web Crypto API
const ENCRYPTION_KEY_NAME = 'messenger-encryption-key';

async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  // Try to get existing key from IndexedDB
  const storedKey = localStorage.getItem(ENCRYPTION_KEY_NAME);

  if (storedKey) {
    try {
      const keyData = JSON.parse(storedKey);
      return await crypto.subtle.importKey(
        'jwk',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    } catch {
      // Key corrupted, create new one
    }
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Store key
  const exportedKey = await crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exportedKey));

  return key;
}

async function encryptMessage(content: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch {
    // Fallback: return plain text if encryption fails
    return content;
  }
}

async function decryptMessage(encryptedContent: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();

    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedContent).split('').map(c => c.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    // Fallback: return as-is if decryption fails (might be plain text)
    return encryptedContent;
  }
}

// Demo teams
const demoTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Frontend Team',
    description: 'Web Frontend Development',
  },
  {
    id: 'team-2',
    name: 'Backend Team',
    description: 'API & Infrastructure',
  },
  {
    id: 'team-3',
    name: 'Mobile Team',
    description: 'iOS & Android Development',
  },
];

// Demo users
const demoUsers: User[] = [
  {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@taskmaster.io',
    status: 'online',
    avatar: undefined,
    teamId: 'team-1',
  },
  {
    id: 'user-2',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah@taskmaster.io',
    status: 'online',
    avatar: undefined,
    teamId: 'team-1',
  },
  {
    id: 'user-3',
    firstName: 'Mike',
    lastName: 'Wilson',
    email: 'mike@taskmaster.io',
    status: 'away',
    lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    teamId: 'team-2',
  },
  {
    id: 'user-4',
    firstName: 'Emily',
    lastName: 'Chen',
    email: 'emily@taskmaster.io',
    status: 'offline',
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    teamId: 'team-2',
  },
  {
    id: 'user-5',
    firstName: 'Alex',
    lastName: 'Brown',
    email: 'alex@taskmaster.io',
    status: 'online',
    teamId: 'team-3',
  },
];

// Demo chats
const demoChats: Chat[] = [
  {
    id: 'chat-1',
    type: 'private',
    participants: [demoUsers[0], demoUsers[1]],
    unreadCount: 2,
    isPinned: true,
    isMuted: false,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'chat-2',
    type: 'group',
    name: 'Frontend Team',
    participants: [demoUsers[0], demoUsers[1], demoUsers[2], demoUsers[3]],
    adminIds: ['user-1'],
    unreadCount: 5,
    isPinned: true,
    isMuted: false,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'chat-3',
    type: 'private',
    participants: [demoUsers[0], demoUsers[2]],
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'chat-4',
    type: 'group',
    name: 'Project Alpha',
    participants: [demoUsers[0], demoUsers[1], demoUsers[4]],
    adminIds: ['user-1', 'user-2'],
    unreadCount: 0,
    isPinned: false,
    isMuted: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo messages
const demoMessages: Message[] = [
  {
    id: 'msg-1',
    chatId: 'chat-1',
    senderId: 'user-2',
    content: 'Hey! How\'s the project going?',
    attachments: [],
    isEdited: false,
    isDeleted: false,
    readBy: ['user-1', 'user-2'],
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-2',
    chatId: 'chat-1',
    senderId: 'user-1',
    content: 'Going great! Just finished the new feature.',
    attachments: [],
    isEdited: false,
    isDeleted: false,
    readBy: ['user-1', 'user-2'],
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-3',
    chatId: 'chat-1',
    senderId: 'user-2',
    content: 'Awesome! Can you send me the updated docs?',
    attachments: [],
    isEdited: false,
    isDeleted: false,
    readBy: ['user-2'],
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-4',
    chatId: 'chat-1',
    senderId: 'user-2',
    content: 'Also, can we schedule a quick call tomorrow?',
    attachments: [],
    isEdited: false,
    isDeleted: false,
    readBy: ['user-2'],
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-5',
    chatId: 'chat-2',
    senderId: 'user-3',
    content: 'Team, the new design mockups are ready for review.',
    attachments: [],
    isEdited: false,
    isDeleted: false,
    readBy: ['user-2', 'user-3'],
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-6',
    chatId: 'chat-2',
    senderId: 'user-2',
    content: 'Great! I\'ll take a look this afternoon.',
    attachments: [],
    isEdited: false,
    isDeleted: false,
    readBy: ['user-2', 'user-3'],
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-7',
    chatId: 'chat-2',
    senderId: 'user-4',
    content: 'Can we discuss the color scheme in our next meeting?',
    attachments: [],
    isEdited: false,
    isDeleted: false,
    readBy: ['user-4'],
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
];

interface MessengerState {
  // Data
  users: User[];
  teams: Team[];
  chats: Chat[];
  messages: Message[];
  currentUserId: string;
  activeChatId: string | null;
  isMessengerOpen: boolean;
  selectedTeamId: string | null; // For filtering users by team
  _hasHydrated: boolean;

  // Actions
  setHasHydrated: (state: boolean) => void;
  openMessenger: () => void;
  closeMessenger: () => void;
  toggleMessenger: () => void;
  setActiveChat: (chatId: string | null) => void;

  // Chat actions
  createPrivateChat: (userId: string) => Chat;
  createGroupChat: (name: string, participantIds: string[]) => Chat;
  updateGroupChat: (chatId: string, data: { name?: string; avatar?: string }) => void;
  addParticipants: (chatId: string, userIds: string[]) => void;
  removeParticipant: (chatId: string, userId: string) => void;
  leaveChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  pinChat: (chatId: string) => void;
  unpinChat: (chatId: string) => void;
  muteChat: (chatId: string) => void;
  unmuteChat: (chatId: string) => void;

  // Message actions
  sendMessage: (chatId: string, content: string, attachments?: Attachment[]) => Promise<Message>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => void;
  markAsRead: (chatId: string) => void;

  // File handling
  uploadFile: (file: File) => Promise<Attachment>;

  // Utility
  getChatMessages: (chatId: string) => Message[];
  getUnreadCount: () => number;
  getUserById: (userId: string) => User | undefined;
  getChatName: (chat: Chat) => string;
  startChatWithUser: (userId: string) => string; // Returns chatId
  findOrCreateUserByEmail: (email: string, name: string, teamId?: string) => User;
  addUser: (user: User) => void;
  setSelectedTeamId: (teamId: string | null) => void;
  getUsersByTeam: (teamId: string | null) => User[];
  getTeamById: (teamId: string) => Team | undefined;
  addTeam: (team: Team) => void;
}

export const useMessengerStore = create<MessengerState>()(
  persist(
    (set, get) => ({
      users: demoUsers,
      teams: demoTeams,
      chats: demoChats,
      messages: demoMessages,
      currentUserId: 'user-1', // Demo: logged in as John Doe
      activeChatId: null,
      isMessengerOpen: false,
      selectedTeamId: null,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      openMessenger: () => set({ isMessengerOpen: true }),
      closeMessenger: () => set({ isMessengerOpen: false }),
      toggleMessenger: () => set((state) => ({ isMessengerOpen: !state.isMessengerOpen })),

      setActiveChat: (chatId) => {
        set({ activeChatId: chatId });
        if (chatId) {
          get().markAsRead(chatId);
        }
      },

      createPrivateChat: (userId) => {
        const { currentUserId, users, chats } = get();
        const otherUser = users.find((u) => u.id === userId);
        const currentUser = users.find((u) => u.id === currentUserId);

        if (!otherUser || !currentUser) throw new Error('User not found');

        // Check if chat already exists
        const existingChat = chats.find(
          (c) =>
            c.type === 'private' &&
            c.participants.some((p) => p.id === userId) &&
            c.participants.some((p) => p.id === currentUserId)
        );

        if (existingChat) return existingChat;

        const newChat: Chat = {
          id: `chat-${Date.now()}`,
          type: 'private',
          participants: [currentUser, otherUser],
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({ chats: [newChat, ...state.chats] }));
        return newChat;
      },

      createGroupChat: (name, participantIds) => {
        const { currentUserId, users } = get();
        const currentUser = users.find((u) => u.id === currentUserId);
        const participants = users.filter(
          (u) => participantIds.includes(u.id) || u.id === currentUserId
        );

        if (!currentUser) throw new Error('Current user not found');

        const newChat: Chat = {
          id: `chat-${Date.now()}`,
          type: 'group',
          name,
          participants,
          adminIds: [currentUserId],
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({ chats: [newChat, ...state.chats] }));
        return newChat;
      },

      updateGroupChat: (chatId, data) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
          ),
        }));
      },

      addParticipants: (chatId, userIds) => {
        const { users } = get();
        const newParticipants = users.filter((u) => userIds.includes(u.id));

        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  participants: [...c.participants, ...newParticipants],
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }));
      },

      removeParticipant: (chatId, userId) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  participants: c.participants.filter((p) => p.id !== userId),
                  adminIds: c.adminIds?.filter((id) => id !== userId),
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }));
      },

      leaveChat: (chatId) => {
        const { currentUserId } = get();
        get().removeParticipant(chatId, currentUserId);
      },

      deleteChat: (chatId) => {
        set((state) => ({
          chats: state.chats.filter((c) => c.id !== chatId),
          messages: state.messages.filter((m) => m.chatId !== chatId),
          activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
        }));
      },

      pinChat: (chatId) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId ? { ...c, isPinned: true } : c
          ),
        }));
      },

      unpinChat: (chatId) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId ? { ...c, isPinned: false } : c
          ),
        }));
      },

      muteChat: (chatId) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId ? { ...c, isMuted: true } : c
          ),
        }));
      },

      unmuteChat: (chatId) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId ? { ...c, isMuted: false } : c
          ),
        }));
      },

      sendMessage: async (chatId, content, attachments = []) => {
        const { currentUserId } = get();

        // Encrypt the message content
        const encryptedContent = await encryptMessage(content);

        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          chatId,
          senderId: currentUserId,
          content: encryptedContent,
          decryptedContent: content, // Store decrypted for display
          attachments,
          isEdited: false,
          isDeleted: false,
          readBy: [currentUserId],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          messages: [...state.messages, newMessage],
          chats: state.chats.map((c) =>
            c.id === chatId
              ? { ...c, lastMessage: newMessage, updatedAt: new Date().toISOString() }
              : c
          ),
        }));

        return newMessage;
      },

      editMessage: async (messageId, newContent) => {
        const encryptedContent = await encryptMessage(newContent);

        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  content: encryptedContent,
                  decryptedContent: newContent,
                  isEdited: true,
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));
      },

      deleteMessage: (messageId) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, content: '', decryptedContent: undefined }
              : m
          ),
        }));
      },

      markAsRead: (chatId) => {
        const { currentUserId } = get();

        set((state) => ({
          messages: state.messages.map((m) =>
            m.chatId === chatId && !m.readBy.includes(currentUserId)
              ? { ...m, readBy: [...m.readBy, currentUserId] }
              : m
          ),
          chats: state.chats.map((c) =>
            c.id === chatId ? { ...c, unreadCount: 0 } : c
          ),
        }));
      },

      uploadFile: async (file: File): Promise<Attachment> => {
        // Simulate file upload - in production this would upload to a server
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const attachment: Attachment = {
              id: `attachment-${Date.now()}`,
              type: file.type.startsWith('image/')
                ? 'image'
                : file.type.startsWith('video/')
                ? 'video'
                : 'document',
              name: file.name,
              url: reader.result as string, // Base64 data URL
              size: file.size,
              mimeType: file.type,
              thumbnailUrl: file.type.startsWith('image/') ? reader.result as string : undefined,
            };
            resolve(attachment);
          };
          reader.readAsDataURL(file);
        });
      },

      getChatMessages: (chatId) => {
        return get().messages.filter((m) => m.chatId === chatId);
      },

      getUnreadCount: () => {
        return get().chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
      },

      getUserById: (userId) => {
        return get().users.find((u) => u.id === userId);
      },

      getChatName: (chat) => {
        if (chat.type === 'group') return chat.name || 'Unnamed Group';
        const { currentUserId } = get();
        const otherUser = chat.participants.find((p) => p.id !== currentUserId);
        return otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown';
      },

      startChatWithUser: (userId) => {
        const { chats, currentUserId } = get();

        // Check if private chat exists
        const existingChat = chats.find(
          (c) =>
            c.type === 'private' &&
            c.participants.some((p) => p.id === userId) &&
            c.participants.some((p) => p.id === currentUserId)
        );

        if (existingChat) {
          set({ activeChatId: existingChat.id, isMessengerOpen: true });
          return existingChat.id;
        }

        // Create new chat
        const newChat = get().createPrivateChat(userId);
        set({ activeChatId: newChat.id, isMessengerOpen: true });
        return newChat.id;
      },

      findOrCreateUserByEmail: (email, name, teamId) => {
        const { users } = get();

        // Check if user already exists by email
        const existingUser = users.find((u) => u.email === email);
        if (existingUser) {
          // Update teamId if provided and user doesn't have one
          if (teamId && !existingUser.teamId) {
            set((state) => ({
              users: state.users.map((u) =>
                u.id === existingUser.id ? { ...u, teamId } : u
              ),
            }));
          }
          return existingUser;
        }

        // Create new user
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || '';

        const newUser: User = {
          id: `user-${Date.now()}`,
          firstName,
          lastName,
          email,
          status: 'offline',
          lastSeen: new Date().toISOString(),
          teamId,
        };

        set((state) => ({ users: [...state.users, newUser] }));
        return newUser;
      },

      addUser: (user) => {
        const { users } = get();
        const existingUser = users.find((u) => u.email === user.email || u.id === user.id);
        if (!existingUser) {
          set((state) => ({ users: [...state.users, user] }));
        }
      },

      setSelectedTeamId: (teamId) => {
        set({ selectedTeamId: teamId });
      },

      getUsersByTeam: (teamId) => {
        const { users, currentUserId } = get();
        if (!teamId) {
          return users.filter((u) => u.id !== currentUserId);
        }
        return users.filter((u) => u.id !== currentUserId && u.teamId === teamId);
      },

      getTeamById: (teamId) => {
        return get().teams.find((t) => t.id === teamId);
      },

      addTeam: (team) => {
        const { teams } = get();
        const existingTeam = teams.find((t) => t.id === team.id);
        if (!existingTeam) {
          set((state) => ({ teams: [...state.teams, team] }));
        }
      },
    }),
    {
      name: 'messenger-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
      partialize: (state) => ({
        chats: state.chats,
        messages: state.messages,
        users: state.users,
        teams: state.teams,
        selectedTeamId: state.selectedTeamId,
      }),
    }
  )
);

// Export encryption utilities for external use
export { encryptMessage, decryptMessage };
