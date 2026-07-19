"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";

type PpvItem = {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string;
  priceCents: number;
  tierRequired: string;
  createdAt: string;
};

export default function AdminPPVPage() {
  const { user, isOwner } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PpvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    mediaUrl: "",
    thumbnailUrl: "",
    priceCents: 500,
    tierRequired: "any",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  // Auth check — use isOwner from useAuth (works with fhcmethod@gmail.com etc)
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-red-950 border border-red-800 rounded-lg p-8 text-center">
          <h1 className="text-xl font-bold text-red-400">Access Denied</h1>
          <p className="text-gray-400 mt-2">Only administrators can access PPV management.</p>
        </div>
      </div>
    );
  }

  // Load existing PPV items
  async function loadItems() {
    try {
      setLoading(true);
      const res = await fetch("/api/ppv/list");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load PPV items");
    } finally {
      setLoading(false);
    }
  }

  // Upload file via /api/media/upload → returns URL
  async function uploadFile(file: File, kind: "library" | "videos"): Promise<string> {
    setUploading(true);
    setUploadProgress(0);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("companion", "koharu");
      fd.append("kind", kind);

      // Use XHR for upload progress tracking
      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.open("POST", "/api/media/upload");
        xhr.send(fd);
      });

      const result = JSON.parse(xhr.responseText);
      if (result.saved && result.saved[0]?.url) {
        return result.saved[0].url;
      }
      throw new Error("Upload did not return a URL");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  // Handle main media file selection
  async function handleMediaFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setError("");

    try {
      const url = await uploadFile(file, file.type.startsWith("video/") ? "videos" : "library");
      setForm((prev) => ({ ...prev, mediaUrl: url }));
    } catch (err: any) {
      setError("File upload failed: " + err.message);
      setSelectedFile(null);
    }
  }

  // Handle thumbnail file selection
  async function handleThumbnailSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setError("");

    try {
      const url = await uploadFile(file, "library");
      setForm((prev) => ({ ...prev, thumbnailUrl: url }));
    } catch (err: any) {
      setError("Thumbnail upload failed: " + err.message);
      setThumbnailFile(null);
    }
  }

  // Create PPV item
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.mediaUrl) {
      setError("Please upload a file first");
      return;
    }
    if (form.priceCents < 100) {
      setError("Minimum price is $1.00");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/ppv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          mediaUrl: form.mediaUrl,
          thumbnailUrl: form.thumbnailUrl || form.mediaUrl,
          priceCents: form.priceCents,
          tierRequired: form.tierRequired,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      // Reset form and reload items
      setForm({
        title: "",
        description: "",
        mediaUrl: "",
        thumbnailUrl: "",
        priceCents: 500,
        tierRequired: "any",
      });
      setSelectedFile(null);
      setThumbnailFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadItems();
    } catch (err: any) {
      setError("Failed to create PPV item: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Delete PPV item
  async function handleDelete(id: string) {
    if (!confirm("Delete this PPV item? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/ppv?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await loadItems();
    } catch (err: any) {
      setError("Failed to delete: " + err.message);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-amber-400 mb-8">PPV Management</h1>

        {error && (
          <div className="bg-red-950 border border-red-700 text-red-300 p-4 rounded mb-6">
            {error}
            <button onClick={() => setError("")} className="ml-4 text-red-500 hover:text-red-300">×</button>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Create Form */}
          <div className="bg-gray-950 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Create PPV Item</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Upload Media File *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaFileSelect}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-amber-900 file:text-amber-200 hover:file:bg-amber-800 cursor-pointer"
                />
                {uploading ? (
                  <div className="mt-2">
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
                  </div>
                ) : selectedFile ? (
                  <p className="text-xs text-green-400 mt-1">✓ Uploaded: {selectedFile.name}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Or paste a URL below</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Media URL (auto-filled or manual)</label>
                <input
                  type="url"
                  value={form.mediaUrl}
                  onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Thumbnail (optional, auto-generates if blank)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailSelect}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700 cursor-pointer"
                />
                {thumbnailFile && (
                  <p className="text-xs text-green-400 mt-1">✓ Thumbnail uploaded</p>
                )}
                <input
                  type="url"
                  value={form.thumbnailUrl}
                  onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                  placeholder="or paste thumbnail URL"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 outline-none mt-1"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Behind the Scenes"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Price (USD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={(form.priceCents / 100).toFixed(2)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          priceCents: Math.round(parseFloat(e.target.value || "0") * 100),
                        })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 pl-7 text-sm focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Min Tier to View</label>
                  <select
                    value={form.tierRequired}
                    onChange={(e) => setForm({ ...form, tierRequired: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 outline-none"
                  >
                    <option value="any">Any (all tiers)</option>
                    <option value="plus">Plus & above</option>
                    <option value="vip">VIP only</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || uploading || !form.mediaUrl}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2 rounded transition-colors"
              >
                {submitting ? "Creating..." : uploading ? "Uploading..." : "Create PPV Item"}
              </button>
            </form>
          </div>

          {/* Existing Items */}
          <div className="bg-gray-950 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-200">Existing PPV Items</h2>
              <button
                onClick={loadItems}
                className="text-sm text-gray-400 hover:text-amber-400 px-2 py-1 border border-gray-700 rounded"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No PPV items yet.</p>
                <p className="text-sm mt-2">Create your first item using the form.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div key={item.id} className="bg-gray-900 border border-gray-700 rounded p-3 flex gap-3">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="w-16 h-16 object-cover rounded bg-gray-800"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-800 rounded flex items-center justify-center text-2xl">
                        🎬
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{item.title || "Untitled"}</h3>
                      <p className="text-xs text-gray-500 truncate">{item.description || "No description"}</p>
                      <div className="flex gap-2 mt-1 text-xs">
                        <span className="text-amber-400 font-medium">${(item.priceCents / 100).toFixed(2)}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-400 uppercase">{item.tierRequired}</span>
                      </div>
                      <a
                        href={item.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 truncate block mt-1"
                      >
                        View source ↗
                      </a>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:text-red-300 p-1 self-start"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
