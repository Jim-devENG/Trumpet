import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiService } from "@/services/api";

const Library = () => {
  const [q, setQ] = useState("");
  const [mountain, setMountain] = useState("");
  const [tag, setTag] = useState("");
  const [prophecies, setProphecies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    title: "",
    body: "",
    videoUrl: "",
    audioUrl: "",
    tags: "",
    mountain: ""
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiService.listProphecies({ q: q || undefined, mountain: mountain || undefined, tag: tag || undefined, limit: 20 });
      if ((res as any).success) setProphecies((res as any).data.prophecies);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      const payload = {
        title: form.title,
        body: form.body || undefined,
        videoUrl: form.videoUrl || undefined,
        audioUrl: form.audioUrl || undefined,
        tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        mountain: form.mountain || undefined,
      };
      const res = await apiService.createProphecy(payload);
      if ((res as any).success) {
        setOpen(false);
        setForm({ title: "", body: "", videoUrl: "", audioUrl: "", tags: "", mountain: "" });
        load();
      }
    } catch (e) {
      // noop
    }
  };

  return (
    <div className="min-h-screen p-6 container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Prophecy Library</h1>
          <p className="text-muted-foreground">Search and publish prophecies across all mountains</p>
        </div>
        <Button onClick={() => setOpen(true)}>Publish Prophecy</Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6 grid md:grid-cols-3 gap-4">
          <Input placeholder="Keyword (title/body)" value={q} onChange={(e) => setQ(e.target.value)} />
          <Input placeholder="Mountain (e.g. government, arts)" value={mountain} onChange={(e) => setMountain(e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="Tag (e.g. healing)" value={tag} onChange={(e) => setTag(e.target.value)} />
            <Button onClick={load} disabled={loading}>Search</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {prophecies.map((p) => (
          <Card key={p.id} className="gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">{p.title}</CardTitle>
              <CardDescription className="text-xs">Mountain: {p.mountain} • {new Date(p.createdAt).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.body && <p className="text-sm whitespace-pre-wrap">{p.body}</p>}
              <div className="flex flex-wrap gap-2 text-xs">
                {p.videoUrl && <a className="underline text-blue-600" href={p.videoUrl} target="_blank" rel="noreferrer">Video</a>}
                {p.audioUrl && <a className="underline text-blue-600" href={p.audioUrl} target="_blank" rel="noreferrer">Audio</a>}
                {Array.isArray(p.tags) && p.tags.map((t: string) => (
                  <span key={t} className="px-2 py-0.5 rounded bg-secondary/30">#{t}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Prophecy</DialogTitle>
            <DialogDescription>Share text, video or audio links. Public to all mountains.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="video">Video URL</Label>
                <Input id="video" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="audio">Audio URL</Label>
                <Input id="audio" value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mountain">Mountain</Label>
                <Input id="mountain" placeholder="government / arts / economy ..." value={form.mountain} onChange={(e) => setForm({ ...form, mountain: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" placeholder="healing, direction" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
            </div>
            <Button className="w-full" onClick={submit} disabled={!form.title.trim()}>Publish</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Library;


