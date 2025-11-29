'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Paperclip,
  Image,
  Video,
  FileText,
  Search,
  MoreVertical,
  Users,
  Plus,
  Pin,
  BellOff,
  Bell,
  Trash2,
  Check,
  CheckCheck,
  ChevronLeft,
  Settings,
  UserPlus,
  Shield,
  Lock,
  File,
  PinOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMessengerStore, Chat, Message, Attachment, User } from '@/stores/messenger.store';
import { useSettingsStore } from '@/stores/settings.store';
import { cn, getInitials } from '@/lib/utils';

// Supported file types
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const SUPPORTED_DOCUMENT_TYPES = [
  // Windows documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Mac documents
  'application/vnd.apple.pages',
  'application/vnd.apple.numbers',
  'application/vnd.apple.keynote',
  // Other common formats
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'application/zip',
  'application/x-rar-compressed',
];

const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES, ...SUPPORTED_DOCUMENT_TYPES];

export function Messenger() {
  const theme = useSettingsStore((state) => state.getCurrentTheme());
  const {
    chats,
    messages,
    users,
    currentUserId,
    activeChatId,
    isMessengerOpen,
    closeMessenger,
    setActiveChat,
    sendMessage,
    uploadFile,
    markAsRead,
    pinChat,
    unpinChat,
    muteChat,
    unmuteChat,
    deleteChat,
    createGroupChat,
    getChatName,
    getUserById,
    getChatMessages,
  } = useMessengerStore();

  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showChatMenu, setShowChatMenu] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [swipeStates, setSwipeStates] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const chatMessages = activeChatId ? getChatMessages(activeChatId) : [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Close chat menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setShowChatMenu(null);
      }
    };

    if (showChatMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChatMenu]);

  // Check mobile view
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSendMessage = async () => {
    if (!activeChatId || (!messageInput.trim() && attachments.length === 0)) return;

    await sendMessage(activeChatId, messageInput.trim(), attachments);
    setMessageInput('');
    setAttachments([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (ALL_SUPPORTED_TYPES.includes(file.type)) {
        const attachment = await uploadFile(file);
        setAttachments((prev) => [...prev, attachment]);
      }
    }

    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    createGroupChat(groupName, selectedUsers);
    setShowGroupModal(false);
    setGroupName('');
    setSelectedUsers([]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const filteredChats = chats
    .filter((chat) => {
      if (!searchQuery) return true;
      const name = getChatName(chat).toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Swipe handlers
  const handleSwipeStart = (chatId: string, startX: number) => {
    setSwipeStates((prev) => ({ ...prev, [`${chatId}_start`]: startX }));
  };

  const handleSwipeMove = (chatId: string, currentX: number) => {
    const startX = swipeStates[`${chatId}_start`] || 0;
    const diff = currentX - startX;
    // Limit swipe distance
    const clampedDiff = Math.max(-100, Math.min(100, diff));
    setSwipeStates((prev) => ({ ...prev, [chatId]: clampedDiff }));
  };

  const handleSwipeEnd = (chatId: string, chat: Chat) => {
    const swipeDistance = swipeStates[chatId] || 0;

    if (swipeDistance < -60) {
      // Swipe left - Pin/Unpin
      if (chat.isPinned) {
        unpinChat(chatId);
      } else {
        pinChat(chatId);
      }
    } else if (swipeDistance > 60) {
      // Swipe right - Delete
      if (confirm('Delete this conversation?')) {
        deleteChat(chatId);
      }
    }

    // Reset swipe state
    setSwipeStates((prev) => {
      const newState = { ...prev };
      delete newState[chatId];
      delete newState[`${chatId}_start`];
      return newState;
    });
  };

  if (!isMessengerOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-4 right-4 z-50 w-[95vw] max-w-[900px] h-[600px] max-h-[80vh] rounded-2xl border border-glass-border shadow-2xl overflow-hidden flex"
        style={{
          backgroundColor: `${theme.colors.background}f8`,
          boxShadow: `0 0 40px ${theme.colors.glow1}, 0 0 80px ${theme.colors.glow2}`,
        }}
      >
        {/* Chat List Sidebar */}
        <div
          className={cn(
            'w-80 border-r border-glass-border flex flex-col',
            isMobileView && activeChatId ? 'hidden' : 'flex'
          )}
        >
          {/* Header */}
          <div className="p-4 border-b border-glass-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5" style={{ color: theme.colors.primary }} />
                <h2 className="text-lg font-semibold">Messages</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Encrypted
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowGroupModal(true)}
                  title="Create Group"
                >
                  <Users className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNewChatModal(true)}
                  title="New Chat"
                >
                  <Plus className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={closeMessenger}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Users className="w-12 h-12 mb-2" />
                <p>No conversations yet</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const chatName = getChatName(chat);
                const otherUser =
                  chat.type === 'private'
                    ? chat.participants.find((p) => p.id !== currentUserId)
                    : null;
                const lastMsg = messages.filter((m) => m.chatId === chat.id).slice(-1)[0];
                const swipeOffset = swipeStates[chat.id] || 0;

                return (
                  <div key={chat.id} className="relative overflow-hidden">
                    {/* Swipe action backgrounds */}
                    <div className="absolute inset-0 flex">
                      {/* Left side - Pin (swipe left reveals this) */}
                      <div
                        className="flex-1 flex items-center justify-end pr-4"
                        style={{ backgroundColor: theme.colors.primary }}
                      >
                        {chat.isPinned ? (
                          <PinOff className="w-6 h-6 text-white" />
                        ) : (
                          <Pin className="w-6 h-6 text-white" />
                        )}
                      </div>
                      {/* Right side - Delete (swipe right reveals this) */}
                      <div className="flex-1 flex items-center justify-start pl-4 bg-red-500">
                        <Trash2 className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {/* Chat item */}
                    <motion.div
                      className={cn(
                        'relative flex items-center gap-3 p-3 cursor-pointer hover:bg-glass-light',
                        activeChatId === chat.id && 'bg-glass-light'
                      )}
                      style={{
                        backgroundColor: theme.colors.background,
                        x: swipeOffset,
                      }}
                      animate={{ x: swipeOffset }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      onClick={() => !swipeOffset && setActiveChat(chat.id)}
                      onTouchStart={(e) => handleSwipeStart(chat.id, e.touches[0].clientX)}
                      onTouchMove={(e) => handleSwipeMove(chat.id, e.touches[0].clientX)}
                      onTouchEnd={() => handleSwipeEnd(chat.id, chat)}
                      onMouseDown={(e) => handleSwipeStart(chat.id, e.clientX)}
                      onMouseMove={(e) => e.buttons === 1 && handleSwipeMove(chat.id, e.clientX)}
                      onMouseUp={() => handleSwipeEnd(chat.id, chat)}
                      onMouseLeave={() => swipeStates[chat.id] && handleSwipeEnd(chat.id, chat)}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center font-medium"
                          style={{ backgroundColor: `${theme.colors.primary}30` }}
                        >
                          {chat.type === 'group' ? (
                            <Users className="w-6 h-6" />
                          ) : otherUser?.avatar ? (
                            <img
                              src={otherUser.avatar}
                              alt={chatName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            getInitials(
                              otherUser?.firstName || '',
                              otherUser?.lastName || ''
                            )
                          )}
                        </div>
                        {otherUser && (
                          <div
                            className={cn(
                              'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2',
                              getStatusColor(otherUser.status)
                            )}
                            style={{ borderColor: theme.colors.background }}
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate flex items-center gap-1">
                            {chat.isPinned && (
                              <Pin className="w-3 h-3 flex-shrink-0" style={{ color: theme.colors.primary }} />
                            )}
                            {chatName}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {lastMsg ? formatTime(lastMsg.createdAt) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-gray-500 truncate">
                            {lastMsg?.isDeleted
                              ? 'Message deleted'
                              : lastMsg?.decryptedContent || lastMsg?.content || 'No messages yet'}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {chat.unreadCount > 0 && (
                              <span
                                className="px-2 py-0.5 text-xs rounded-full text-white"
                                style={{ backgroundColor: theme.colors.primary }}
                              >
                                {chat.unreadCount}
                              </span>
                            )}
                            {chat.isMuted && <BellOff className="w-4 h-4 text-gray-500" />}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div
          className={cn(
            'flex-1 flex flex-col',
            isMobileView && !activeChatId ? 'hidden' : 'flex'
          )}
        >
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-glass-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isMobileView && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActiveChat(null)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  )}
                  {/* Avatar - separated from close button with gap */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-medium flex-shrink-0"
                    style={{ backgroundColor: `${theme.colors.primary}30` }}
                  >
                    {activeChat.type === 'group' ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      getInitials(
                        activeChat.participants.find((p) => p.id !== currentUserId)?.firstName || '',
                        activeChat.participants.find((p) => p.id !== currentUserId)?.lastName || ''
                      )
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{getChatName(activeChat)}</h3>
                    <p className="text-xs text-gray-500">
                      {activeChat.type === 'group'
                        ? `${activeChat.participants.length} members`
                        : activeChat.participants.find((p) => p.id !== currentUserId)?.status ||
                          'offline'}
                    </p>
                  </div>
                </div>
                {/* Settings button only */}
                <Button
                  variant="ghost"
                  size="icon"
                  title="Chat Settings"
                  onClick={() => setShowSettingsModal(true)}
                  className="flex-shrink-0 ml-2"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((message, index) => {
                  const isOwn = message.senderId === currentUserId;
                  const sender = getUserById(message.senderId);
                  const showAvatar =
                    !isOwn &&
                    (index === 0 ||
                      chatMessages[index - 1]?.senderId !== message.senderId);

                  return (
                    <div
                      key={message.id}
                      className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      {!isOwn && showAvatar && (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                          style={{ backgroundColor: `${theme.colors.primary}30` }}
                        >
                          {getInitials(sender?.firstName || '', sender?.lastName || '')}
                        </div>
                      )}
                      {!isOwn && !showAvatar && <div className="w-8" />}

                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2',
                          isOwn
                            ? 'rounded-br-md'
                            : 'rounded-bl-md',
                          message.isDeleted ? 'italic text-gray-500' : ''
                        )}
                        style={{
                          backgroundColor: isOwn
                            ? theme.colors.primary
                            : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        {activeChat.type === 'group' && !isOwn && showAvatar && (
                          <p
                            className="text-xs font-medium mb-1"
                            style={{ color: theme.colors.secondary }}
                          >
                            {sender?.firstName} {sender?.lastName}
                          </p>
                        )}

                        {message.isDeleted ? (
                          <p className="text-sm">This message was deleted</p>
                        ) : (
                          <>
                            {/* Attachments */}
                            {message.attachments.length > 0 && (
                              <div className="space-y-2 mb-2">
                                {message.attachments.map((att) => (
                                  <div key={att.id}>
                                    {att.type === 'image' ? (
                                      <img
                                        src={att.url}
                                        alt={att.name}
                                        className="max-w-full rounded-lg"
                                      />
                                    ) : att.type === 'video' ? (
                                      <video
                                        src={att.url}
                                        controls
                                        className="max-w-full rounded-lg"
                                      />
                                    ) : (
                                      <a
                                        href={att.url}
                                        download={att.name}
                                        className="flex items-center gap-2 p-2 rounded-lg bg-glass-light hover:bg-glass-medium transition"
                                      >
                                        <File className="w-8 h-8" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">
                                            {att.name}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {formatFileSize(att.size)}
                                          </p>
                                        </div>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <p className="text-sm whitespace-pre-wrap">
                              {message.decryptedContent || message.content}
                            </p>
                          </>
                        )}

                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs opacity-70">
                            {formatTime(message.createdAt)}
                          </span>
                          {message.isEdited && (
                            <span className="text-xs opacity-50">edited</span>
                          )}
                          {isOwn && (
                            <span className="ml-1">
                              {message.readBy.length > 1 ? (
                                <CheckCheck className="w-4 h-4 text-blue-400" />
                              ) : (
                                <Check className="w-4 h-4 opacity-70" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="px-4 py-2 border-t border-glass-border">
                  <div className="flex gap-2 overflow-x-auto">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-glass-light"
                      >
                        {att.type === 'image' ? (
                          <img
                            src={att.url}
                            alt={att.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2">
                            {getFileIcon(att.mimeType)}
                            <span className="text-xs truncate w-full text-center mt-1">
                              {att.name}
                            </span>
                          </div>
                        )}
                        <button
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                          onClick={() => removeAttachment(att.id)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t border-glass-border">
                <div className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept={ALL_SUPPORTED_TYPES.join(',')}
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="pr-10"
                    />
                  </div>
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() && attachments.length === 0}
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                    }}
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <Lock className="w-16 h-16 mb-4" style={{ color: theme.colors.primary }} />
              <h3 className="text-xl font-semibold mb-2">End-to-End Encrypted</h3>
              <p className="text-center max-w-md">
                Select a conversation or start a new chat. All messages are encrypted for your privacy.
              </p>
            </div>
          )}
        </div>

        {/* New Chat Modal */}
        <AnimatePresence>
          {showNewChatModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center z-20"
              onClick={() => setShowNewChatModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-80 rounded-2xl border border-glass-border p-4"
                style={{ backgroundColor: theme.colors.background }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-4">New Chat</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {users
                    .filter((u) => u.id !== currentUserId)
                    .map((user) => (
                      <button
                        key={user.id}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-glass-light transition"
                        onClick={() => {
                          useMessengerStore.getState().startChatWithUser(user.id);
                          setShowNewChatModal(false);
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-medium"
                          style={{ backgroundColor: `${theme.colors.primary}30` }}
                        >
                          {getInitials(user.firstName, user.lastName)}
                        </div>
                        <div className="text-left">
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{user.status}</p>
                        </div>
                      </button>
                    ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Group Modal */}
        <AnimatePresence>
          {showGroupModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center z-20"
              onClick={() => setShowGroupModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-80 rounded-2xl border border-glass-border p-4"
                style={{ backgroundColor: theme.colors.background }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-4">Create Group</h3>
                <Input
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mb-4"
                />
                <p className="text-sm text-gray-500 mb-2">Select members:</p>
                <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                  {users
                    .filter((u) => u.id !== currentUserId)
                    .map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-glass-light transition cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                            }
                          }}
                          className="rounded"
                        />
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                          style={{ backgroundColor: `${theme.colors.primary}30` }}
                        >
                          {getInitials(user.firstName, user.lastName)}
                        </div>
                        <span>
                          {user.firstName} {user.lastName}
                        </span>
                      </label>
                    ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowGroupModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || selectedUsers.length === 0}
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                    }}
                  >
                    Create
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Settings Modal */}
        <AnimatePresence>
          {showSettingsModal && activeChat && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center z-20"
              onClick={() => setShowSettingsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-80 rounded-2xl border border-glass-border p-4"
                style={{ backgroundColor: theme.colors.background }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Chat Settings</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettingsModal(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Chat info */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-glass-light mb-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center font-medium text-lg"
                    style={{ backgroundColor: `${theme.colors.primary}30` }}
                  >
                    {activeChat.type === 'group' ? (
                      <Users className="w-7 h-7" />
                    ) : (
                      getInitials(
                        activeChat.participants.find((p) => p.id !== currentUserId)?.firstName || '',
                        activeChat.participants.find((p) => p.id !== currentUserId)?.lastName || ''
                      )
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{getChatName(activeChat)}</p>
                    <p className="text-sm text-gray-500">
                      {activeChat.type === 'group'
                        ? `${activeChat.participants.length} members`
                        : activeChat.participants.find((p) => p.id !== currentUserId)?.email || 'Private chat'}
                    </p>
                  </div>
                </div>

                {/* Settings options */}
                <div className="space-y-1">
                  <button
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-glass-light transition text-left"
                    onClick={() => {
                      activeChat.isPinned ? unpinChat(activeChat.id) : pinChat(activeChat.id);
                    }}
                  >
                    {activeChat.isPinned ? (
                      <PinOff className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    ) : (
                      <Pin className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    )}
                    <span>{activeChat.isPinned ? 'Unpin conversation' : 'Pin conversation'}</span>
                  </button>

                  <button
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-glass-light transition text-left"
                    onClick={() => {
                      activeChat.isMuted ? unmuteChat(activeChat.id) : muteChat(activeChat.id);
                    }}
                  >
                    {activeChat.isMuted ? (
                      <Bell className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    ) : (
                      <BellOff className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    )}
                    <span>{activeChat.isMuted ? 'Unmute notifications' : 'Mute notifications'}</span>
                  </button>

                  {activeChat.type === 'group' && (
                    <button
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-glass-light transition text-left"
                      onClick={() => {
                        // Show participants
                      }}
                    >
                      <Users className="w-5 h-5" style={{ color: theme.colors.primary }} />
                      <span>View members ({activeChat.participants.length})</span>
                    </button>
                  )}

                  <div className="border-t border-glass-border my-2" />

                  <button
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 transition text-left text-red-400"
                    onClick={() => {
                      if (confirm('Delete this conversation? This action cannot be undone.')) {
                        deleteChat(activeChat.id);
                        setShowSettingsModal(false);
                        setActiveChat(null);
                      }
                    }}
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Delete conversation</span>
                  </button>
                </div>

                {/* Encryption badge */}
                <div className="mt-4 p-3 rounded-xl bg-green-500/10 flex items-center gap-2 text-green-400 text-sm">
                  <Shield className="w-4 h-4" />
                  <span>End-to-end encrypted</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
