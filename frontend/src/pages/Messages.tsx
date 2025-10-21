import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { apiService } from "@/services/api";

export default function MessagesPage() {
  const { user: authUser } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messagesByUser, setMessagesByUser] = useState<Record<string, any[]>>({});
  const [composerByUser, setComposerByUser] = useState<Record<string, string>>({});
  const [activeChatUserId, setActiveChatUserId] = useState<string>("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatUserId, setNewChatUserId] = useState<string>("");
  const [newChatText, setNewChatText] = useState<string>("");
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const loadConversations = async () => {
    try {
      const res = await apiService.getConversations();
      if ((res as any).success) {
        const raw = (res as any).data.conversations;
        const list = raw.map((c: any) => ({
          partnerId: c.partnerId,
          name: c.partnerName || `User ${c.partnerId}`,
          unreadCount: c.unreadCount ?? 0,
          lastMessage: c.lastMessage?.content ?? ""
        }));
        setConversations(list);
        if (!activeChatUserId && list.length > 0) {
          setActiveChatUserId(list[0].partnerId);
          openThread(list[0].partnerId);
        }
      }
    } catch {}
  };

  const loadUsers = async () => {
    try {
      // Load a list of users to start new chats with (same mountain/community if available)
      const res = await apiService.getUsers({ limit: 50 });
      if ((res as any).success) setUsers((res as any).data.users || []);
    } catch {}
  };

  const openThread = async (partnerId: string) => {
    try {
      const res = await apiService.getMessages(partnerId, 1, 50);
      if ((res as any).success) {
        setMessagesByUser((prev) => ({ ...prev, [partnerId]: (res as any).data.messages }));
      }
    } catch {}
  };

  const sendMessageTo = async (partnerId: string) => {
    const text = (composerByUser[partnerId] || "").trim();
    if (!partnerId || !text) return;
    try {
      const res = await apiService.sendMessage(partnerId, text);
      if ((res as any).success) {
        setComposerByUser((prev) => ({ ...prev, [partnerId]: "" }));
        const th = await apiService.getMessages(partnerId, 1, 50);
        if ((th as any).success) {
          setMessagesByUser((prev) => ({ ...prev, [partnerId]: (th as any).data.messages }));
        }
        loadConversations();
      }
    } catch {}
  };

  const startNewChat = async () => {
    if (!newChatUserId || !newChatText.trim()) return;
    try {
      setIsStartingChat(true);
      const res = await apiService.sendMessage(newChatUserId, newChatText.trim());
      if ((res as any).success) {
        setShowNewChat(false);
        setNewChatUserId("");
        setNewChatText("");
        await loadConversations();
        setActiveChatUserId(newChatUserId);
        await openThread(newChatUserId);
      }
    } catch {} finally {
      setIsStartingChat(false);
    }
  };

  useEffect(() => {
    loadConversations();
    loadUsers();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-center w-full">Messages</h1>
          <div className="absolute right-6">
            <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">New Chat</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start a new chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm">User</label>
                    <Select value={newChatUserId} onValueChange={setNewChatUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter((u) => u.id !== authUser?.id)
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {(u.first_name || u.firstName || "") + " " + (u.last_name || u.lastName || "")} (@{u.username})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm">First message</label>
                    <Textarea
                      placeholder="Say hello..."
                      value={newChatText}
                      onChange={(e) => setNewChatText(e.target.value)}
                    />
                  </div>
                  <Button onClick={startNewChat} disabled={!newChatUserId || !newChatText.trim() || isStartingChat}>
                    {isStartingChat ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="grid grid-cols-12 border rounded-lg overflow-hidden shadow-xl">
        {/* Conversations */}
        <div className="col-span-12 md:col-span-4 border-r max-h-[70vh] overflow-auto">
          <div className="p-3 border-b font-semibold">Conversations</div>
          <div className="p-2">
            {conversations.map((c) => (
              <button
                key={c.partnerId}
                className={`w-full text-left px-3 py-2 rounded hover:bg-accent ${activeChatUserId === c.partnerId ? 'bg-accent' : ''}`}
                onClick={() => { setActiveChatUserId(c.partnerId); openThread(c.partnerId); }}
              >
                <div className="flex items-center justify-between">
                  <div className="truncate pr-2">{c.name}</div>
                  {c.unreadCount > 0 && <Badge variant="secondary">{c.unreadCount}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{c.lastMessage}</div>
              </button>
            ))}
            {conversations.length === 0 && (
              <div className="text-xs text-muted-foreground px-3">No conversations</div>
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="col-span-12 md:col-span-8 flex flex-col max-h-[70vh]">
          <div className="p-3 border-b font-semibold">
            {conversations.find(c => c.partnerId === activeChatUserId)?.name || 'Select a conversation'}
          </div>
          <div className="flex-1 p-3 overflow-auto space-y-2 bg-muted/20">
            {(messagesByUser[activeChatUserId] || []).map((m: any) => (
              <div key={m.id} className={`max-w-[70%] p-2 rounded border ${m.senderId === activeChatUserId ? 'self-start bg-muted' : 'self-end bg-primary/10 ml-auto'}`}>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{new Date(m.created_at || Date.now()).toLocaleTimeString()}</p>
              </div>
            ))}
            {(messagesByUser[activeChatUserId] || []).length === 0 && (
              <div className="text-xs text-muted-foreground text-center mt-10">No messages yet</div>
            )}
          </div>
          <div className="p-3 border-t flex gap-2">
            <Input
              placeholder="Type a message..."
              value={composerByUser[activeChatUserId] || ''}
              onChange={(e) => setComposerByUser((prev) => ({ ...prev, [activeChatUserId]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessageTo(activeChatUserId); }}
            />
            <Button onClick={() => sendMessageTo(activeChatUserId)} disabled={!composerByUser[activeChatUserId]?.trim()}>Send</Button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}


