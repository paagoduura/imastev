import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Heart, ImagePlus, MessageCircle, Send, Sparkles, ThumbsUp, Users, X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { buildApiUrl } from "@/lib/config";

type CommunityType = "hair" | "skin";
type ReactionType = "like" | "love";

type Reply = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
};

type Comment = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
  loves: number;
  userReaction: ReactionType | null;
  replies: Reply[];
};

type Post = {
  id: string;
  community: CommunityType;
  author: string;
  authorRole: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  likes: number;
  loves: number;
  userReaction: ReactionType | null;
  comments: Comment[];
};

const EMOJI_OPTIONS = [
  "\uD83D\uDE00",
  "\uD83D\uDE0D",
  "\uD83D\uDD25",
  "\uD83D\uDCA7",
  "\u2728",
  "\uD83D\uDC4F",
  "\uD83D\uDCAA",
  "\uD83D\uDC9A",
];

const normalizeReply = (value: unknown): Reply | null => {
  if (!value || typeof value !== "object") return null;
  const reply = value as Partial<Reply>;

  return {
    id: typeof reply.id === "string" ? reply.id : crypto.randomUUID(),
    author: typeof reply.author === "string" ? reply.author : "Community Member",
    content: typeof reply.content === "string" ? reply.content : "",
    createdAt: typeof reply.createdAt === "string" ? reply.createdAt : new Date().toISOString(),
  };
};

const normalizeComment = (value: unknown): Comment | null => {
  if (!value || typeof value !== "object") return null;
  const comment = value as Partial<Comment> & { replies?: unknown[] };

  return {
    id: typeof comment.id === "string" ? comment.id : crypto.randomUUID(),
    author: typeof comment.author === "string" ? comment.author : "Community Member",
    content: typeof comment.content === "string" ? comment.content : "",
    createdAt: typeof comment.createdAt === "string" ? comment.createdAt : new Date().toISOString(),
    likes: typeof comment.likes === "number" ? comment.likes : 0,
    loves: typeof comment.loves === "number" ? comment.loves : 0,
    userReaction: comment.userReaction === "like" || comment.userReaction === "love" ? comment.userReaction : null,
    replies: Array.isArray(comment.replies) ? comment.replies.map(normalizeReply).filter(Boolean) as Reply[] : [],
  };
};

const normalizePost = (value: unknown): Post | null => {
  if (!value || typeof value !== "object") return null;
  const post = value as Partial<Post> & { comments?: unknown[] };
  const community: CommunityType = post.community === "skin" ? "skin" : "hair";

  return {
    id: typeof post.id === "string" ? post.id : crypto.randomUUID(),
    community,
    author: typeof post.author === "string" ? post.author : "Community Member",
    authorRole: typeof post.authorRole === "string" ? post.authorRole : `${community === "hair" ? "Hair" : "Skin"} Journey Member`,
    content: typeof post.content === "string" ? post.content : "",
    imageUrl: typeof post.imageUrl === "string" && post.imageUrl.trim() ? post.imageUrl : null,
    createdAt: typeof post.createdAt === "string" ? post.createdAt : new Date().toISOString(),
    likes: typeof post.likes === "number" ? post.likes : 0,
    loves: typeof post.loves === "number" ? post.loves : 0,
    userReaction: post.userReaction === "like" || post.userReaction === "love" ? post.userReaction : null,
    comments: Array.isArray(post.comments) ? post.comments.map(normalizeComment).filter(Boolean) as Comment[] : [],
  };
};

const formatTimeAgo = (isoDate: string) => {
  const ms = Date.now() - new Date(isoDate).getTime();
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (ms < hour) return `${Math.max(1, Math.floor(ms / minute))}m ago`;
  if (ms < day) return `${Math.floor(ms / hour)}h ago`;
  return `${Math.floor(ms / day)}d ago`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "CM";

const COMMUNITY_COPY: Record<
  CommunityType,
  { title: string; description: string; accent: string; badge: string; composerHint: string }
> = {
  hair: {
    title: "Hair Community",
    description: "Protective styling, growth progress, scalp care, moisture routines, and salon wisdom.",
    accent: "from-violet-100 via-white to-emerald-50",
    badge: "Hair circle",
    composerHint: "Share a routine update, question, progress shot, or styling win.",
  },
  skin: {
    title: "Skin Community",
    description: "Barrier repair, acne support, glow routines, sensitive-skin care, and trusted progress notes.",
    accent: "from-amber-50 via-white to-rose-50",
    badge: "Skin circle",
    composerHint: "Share what changed, what helped, and what you want feedback on.",
  },
};

const Community = () => {
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityType>("hair");
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [authorName, setAuthorName] = useState("Community Member");
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || localStorage.getItem("glowsense_token") || "";
  }, []);

  const apiRequest = useCallback(async (path: string, options: RequestInit = {}, requireAuth = false) => {
    const token = await getToken();
    if (requireAuth && !token) {
      throw new Error("Please sign in to interact with the community.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(buildApiUrl(path), { ...options, headers });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (requireAuth && (response.status === 401 || response.status === 403)) {
        throw new Error("Your session has expired. Please sign in again to post, comment, or react.");
      }

      if (!requireAuth && (response.status === 401 || response.status === 403)) {
        localStorage.removeItem("glowsense_token");
      }

      const message = payload?.error || payload?.message || "Request failed";
      throw new Error(message);
    }

    return payload;
  }, [getToken]);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });

  const loadPosts = useCallback(async (community: CommunityType) => {
    setLoading(true);
    setError("");
    try {
      const payload = await apiRequest(`/community/posts?community=${community}`);
      setPosts(Array.isArray(payload.posts) ? payload.posts.map(normalizePost).filter(Boolean) as Post[] : []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load community posts.";

      // Public community reads should still work even if a stale auth token is hanging around.
      if (message.toLowerCase().includes("expired") || message.toLowerCase().includes("unauthorized")) {
        try {
          const payload = await fetch(buildApiUrl(`/community/posts?community=${community}`)).then((response) =>
            response.ok ? response.json() : Promise.reject(new Error("Unable to load community posts.")),
          );
          setPosts(Array.isArray(payload.posts) ? payload.posts.map(normalizePost).filter(Boolean) as Post[] : []);
          setError("");
          return;
        } catch {
          // Fall through to the original error state if the anonymous retry fails.
        }
      }

      setError(message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    const hydrateUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      const fallback = user.email?.split("@")[0] ?? "Community Member";
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        fallback;
      setAuthorName(fullName);
    };

    hydrateUser();
  }, []);

  useEffect(() => {
    loadPosts(selectedCommunity);
  }, [loadPosts, selectedCommunity]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const filteredPosts = useMemo(
    () => posts.filter((post) => post.community === selectedCommunity),
    [posts, selectedCommunity],
  );

  const appendEmojiToPost = (emoji: string) => setNewPost((prev) => `${prev}${emoji}`);
  const appendEmojiToComment = (postId: string, emoji: string) =>
    setCommentDrafts((prev) => ({ ...prev, [postId]: `${prev[postId] || ""}${emoji}` }));
  const appendEmojiToReply = (postId: string, commentId: string, emoji: string) => {
    const draftKey = `${postId}:${commentId}`;
    setReplyDrafts((prev) => ({ ...prev, [draftKey]: `${prev[draftKey] || ""}${emoji}` }));
  };
  const markImageAsFailed = (imageUrl?: string | null) => {
    if (!imageUrl) return;
    setFailedImages((prev) => ({ ...prev, [imageUrl]: true }));
    setActiveImageUrl((current) => (current === imageUrl ? null : current));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setSelectedImageFile(null);
      if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
      setSelectedImagePreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSelectedImageFile(null);
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSelectedImageFile(null);
      setError("Image is too large. Maximum size is 10MB.");
      return;
    }

    if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
    setSelectedImageFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
    setError("");
  };

  const createPost = async () => {
    const content = newPost.trim();
    if (!content && !selectedImageFile) return;
    setSubmitting(true);
    setError("");
    try {
      let imageUrl = "";
      if (selectedImageFile) {
        const base64 = await fileToBase64(selectedImageFile);
        const upload = await apiRequest(
          "/community/upload-image",
          {
            method: "POST",
            body: JSON.stringify({
              communityType: selectedCommunity,
              fileName: selectedImageFile.name,
              contentType: selectedImageFile.type,
              base64,
            }),
          },
          true,
        );
        imageUrl = String(upload.publicUrl || "");
      }

      await apiRequest(
        "/community/posts",
        {
          method: "POST",
          body: JSON.stringify({
            communityType: selectedCommunity,
            authorName,
            content,
            imageUrl,
          }),
        },
        true,
      );
      setNewPost("");
      setSelectedImageFile(null);
      if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
      setSelectedImagePreview(null);
      await loadPosts(selectedCommunity);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to publish post.");
    } finally {
      setSubmitting(false);
    }
  };

  const react = async (params: { postId?: string; commentId?: string; reaction: ReactionType }) => {
    setError("");
    try {
      await apiRequest(
        "/community/reactions",
        {
          method: "POST",
          body: JSON.stringify(params),
        },
        true,
      );
      await loadPosts(selectedCommunity);
    } catch (reactionError) {
      setError(reactionError instanceof Error ? reactionError.message : "Unable to update reaction.");
    }
  };

  const addComment = async (postId: string) => {
    const content = (commentDrafts[postId] ?? "").trim();
    if (!content) return;
    setSubmitting(true);
    setError("");
    try {
      await apiRequest(
        "/community/comments",
        {
          method: "POST",
          body: JSON.stringify({ postId, content, authorName }),
        },
        true,
      );
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      setOpenComments((prev) => ({ ...prev, [postId]: true }));
      await loadPosts(selectedCommunity);
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "Unable to add comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const addReply = async (postId: string, commentId: string) => {
    const draftKey = `${postId}:${commentId}`;
    const content = (replyDrafts[draftKey] ?? "").trim();
    if (!content) return;
    setSubmitting(true);
    setError("");
    try {
      await apiRequest(
        "/community/comments",
        {
          method: "POST",
          body: JSON.stringify({ postId, parentCommentId: commentId, content, authorName }),
        },
        true,
      );
      setReplyDrafts((prev) => ({ ...prev, [draftKey]: "" }));
      setOpenComments((prev) => ({ ...prev, [postId]: true }));
      await loadPosts(selectedCommunity);
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "Unable to add reply.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background page-reveal">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="relative overflow-hidden rounded-[28px] border border-primary/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)] section-reveal">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_28%)]" />
          <div className="relative grid gap-6 p-5 sm:p-8 lg:p-10">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">Community Hub</Badge>
              <h1 className="max-w-3xl text-3xl font-display font-bold text-slate-900 sm:text-4xl">
                A calmer, smarter space for hair and skin conversations
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Share polished progress updates, ask focused questions, and learn from routines that are actually
                working for people like you.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 section-reveal">
          {(["hair", "skin"] as CommunityType[]).map((community) => {
            const isActive = selectedCommunity === community;
            const copy = COMMUNITY_COPY[community];
            const Icon = community === "hair" ? Sparkles : Users;

            return (
              <button
                key={community}
                type="button"
                onClick={() => setSelectedCommunity(community)}
                className={`rounded-2xl border p-4 text-left transition-all sm:p-5 ${
                  isActive
                    ? "border-primary/35 bg-white shadow-[0_14px_40px_rgba(124,58,237,0.12)]"
                    : "border-primary/10 bg-white hover:border-primary/20 hover:bg-primary/5"
                }`}
              >
                <div className={`rounded-xl bg-gradient-to-br ${copy.accent} p-4`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="border-primary/20 bg-white/80 text-primary">
                      {copy.badge}
                    </Badge>
                  </div>
                  <p className="text-base font-semibold text-slate-900">{copy.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{copy.description}</p>
                </div>
              </button>
            );
          })}
        </section>

        {error && (
          <section className="mt-6">
            <Card className="rounded-2xl border-red-200 bg-red-50 shadow-none">
              <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
            </Card>
          </section>
        )}

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)] section-reveal">
          <div className="xl:sticky xl:top-24 xl:self-start">
            <Card className="overflow-hidden rounded-[24px] border-primary/15 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <CardHeader className="border-b border-primary/10 bg-slate-50/80 p-5 sm:p-6">
                <Badge className="mb-3 w-fit bg-primary text-white">New post</Badge>
                <CardTitle className="text-xl sm:text-2xl">
                  Share Your {selectedCommunity === "hair" ? "Hair" : "Skin"} Journey
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  {COMMUNITY_COPY[selectedCommunity].composerHint}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-5 sm:p-6 sm:pt-6">
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your display name"
                  className="h-11 rounded-xl"
                />
                <Textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder={`What's new in your ${selectedCommunity} journey?`}
                  className="min-h-[140px] rounded-2xl border-primary/15 bg-slate-50/70 px-4 py-3 text-sm leading-6"
                />
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-10 min-w-10 rounded-full border-primary/15 bg-white px-0"
                      onClick={() => appendEmojiToPost(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>

                <div className="rounded-2xl border border-dashed border-primary/20 bg-slate-50/80 p-4">
                  <input
                    id="community-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {!selectedImagePreview ? (
                    <label
                      htmlFor="community-image-upload"
                      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-white bg-white p-5 text-center shadow-sm transition hover:border-primary/20 hover:bg-primary/5"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ImagePlus className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Add a polished image</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Best with portrait or balanced landscape framing. Up to 10MB.</p>
                      </div>
                    </label>
                  ) : (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white">
                        <div className="aspect-[4/3] w-full bg-slate-100">
                          <img
                            src={selectedImagePreview}
                            alt="Selected post image preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{selectedImageFile?.name}</p>
                          <p className="text-xs text-slate-500">
                            {selectedImageFile ? formatFileSize(selectedImageFile.size) : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <label
                            htmlFor="community-image-upload"
                            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-primary/15 px-4 text-sm font-medium text-slate-700 transition hover:bg-primary/5"
                          >
                            Replace
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-10 rounded-xl px-4 text-slate-600"
                            onClick={() => {
                              setSelectedImageFile(null);
                              if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
                              setSelectedImagePreview(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-primary/10 pt-2">
                  <p className="text-xs leading-5 text-slate-500">Clear, close-up images get better community feedback.</p>
                  <Button onClick={createPost} className="h-11 rounded-xl px-5" disabled={submitting}>
                    <Send className="h-4 w-4" />
                    {submitting ? "Publishing..." : "Publish"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <section className="space-y-4">
          {loading && (
            <Card className="rounded-[24px] border-primary/10 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
              <CardContent className="pt-6 text-center text-muted-foreground">Loading community posts...</CardContent>
            </Card>
          )}

          {!loading && filteredPosts.length === 0 && (
            <Card className="rounded-[24px] border-primary/10 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
              <CardContent className="pt-6 text-center text-muted-foreground">
                No posts yet in this community. Be the first to share your journey.
              </CardContent>
            </Card>
          )}

          {!loading &&
            filteredPosts.map((post) => {
              const commentCount = post.comments.length + post.comments.reduce((sum, c) => sum + c.replies.length, 0);

              return (
                <Card
                  key={post.id}
                  className="overflow-hidden rounded-[24px] border-primary/10 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
                >
                  <CardHeader className="space-y-4 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                          {getInitials(post.author)}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base sm:text-lg">{post.author}</CardTitle>
                          <CardDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
                            <span>{post.authorRole}</span>
                            <span className="hidden sm:inline">|</span>
                            <span>{formatTimeAgo(post.createdAt)}</span>
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 capitalize border-primary/20 bg-primary/5 text-primary">
                        {post.community}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
                    <p className="text-sm leading-7 text-slate-700 sm:text-[15px]">{post.content}</p>
                    {post.imageUrl && !failedImages[post.imageUrl] ? (
                      <div className="overflow-hidden rounded-[22px] border border-primary/10 bg-slate-100">
                        <button
                          type="button"
                          onClick={() => setActiveImageUrl(post.imageUrl || null)}
                          className="block w-full text-left"
                        >
                          <div className="aspect-[4/5] w-full sm:aspect-[16/10] lg:aspect-[4/3]">
                            <img
                              src={post.imageUrl}
                              alt={`${post.community} journey post`}
                              className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                              loading="lazy"
                              onError={() => markImageAsFailed(post.imageUrl)}
                            />
                          </div>
                        </button>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        variant={post.userReaction === "like" ? "default" : "outline"}
                        size="sm"
                        className="h-10 justify-center gap-2 rounded-xl border-primary/15 bg-white px-4 sm:justify-start"
                        onClick={() => react({ postId: post.id, reaction: "like" })}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        Like ({post.likes})
                      </Button>
                      <Button
                        variant={post.userReaction === "love" ? "default" : "outline"}
                        size="sm"
                        className="h-10 justify-center gap-2 rounded-xl border-primary/15 bg-white px-4 sm:justify-start"
                        onClick={() => react({ postId: post.id, reaction: "love" })}
                      >
                        <Heart className="h-4 w-4" />
                        Love ({post.loves})
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 justify-center gap-2 rounded-xl px-4 sm:justify-start"
                        onClick={() => setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Comments ({commentCount})
                      </Button>
                    </div>

                    {openComments[post.id] && (
                      <div className="space-y-4 rounded-[22px] border border-primary/10 bg-primary/5 p-4 sm:p-5">
                        <div className="space-y-3">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                    {getInitials(comment.author)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">{comment.author}</p>
                                    <p className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</p>
                                  </div>
                                </div>
                              </div>
                              <p className="mt-3 text-sm leading-6 text-slate-700">{comment.content}</p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={comment.userReaction === "like" ? "default" : "outline"}
                                  className="h-9 rounded-xl border-primary/15 px-3"
                                  onClick={() => react({ commentId: comment.id, reaction: "like" })}
                                >
                                  <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                                  Like {comment.likes}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={comment.userReaction === "love" ? "default" : "outline"}
                                  className="h-9 rounded-xl border-primary/15 px-3"
                                  onClick={() => react({ commentId: comment.id, reaction: "love" })}
                                >
                                  <Heart className="h-3.5 w-3.5 mr-1" />
                                  Love {comment.loves}
                                </Button>
                              </div>

                              <div className="mt-4 space-y-2 border-l-2 border-primary/15 pl-3">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs font-semibold text-slate-900">{reply.author}</p>
                                    <p className="mt-1 text-sm leading-6 text-slate-700">{reply.content}</p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">{formatTimeAgo(reply.createdAt)}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4 space-y-3">
                                <Input
                                  placeholder="Write a reply..."
                                  value={replyDrafts[`${post.id}:${comment.id}`] ?? ""}
                                  onChange={(e) =>
                                    setReplyDrafts((prev) => ({ ...prev, [`${post.id}:${comment.id}`]: e.target.value }))
                                  }
                                  className="h-11 rounded-xl"
                                />
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                                    {EMOJI_OPTIONS.slice(0, 4).map((emoji) => (
                                      <Button
                                        key={`${comment.id}-${emoji}`}
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-9 min-w-9 rounded-full border-primary/15 px-0"
                                        onClick={() => appendEmojiToReply(post.id, comment.id, emoji)}
                                      >
                                        {emoji}
                                      </Button>
                                    ))}
                                  </div>
                                  <Button
                                    size="sm"
                                    className="h-10 rounded-xl px-4"
                                    onClick={() => addReply(post.id, comment.id)}
                                    disabled={submitting}
                                  >
                                  Reply
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
                          <div className="space-y-3">
                          <Input
                            placeholder="Write a comment..."
                            value={commentDrafts[post.id] ?? ""}
                            onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            className="h-11 rounded-xl"
                          />
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                                {EMOJI_OPTIONS.slice(0, 4).map((emoji) => (
                                  <Button
                                    key={`${post.id}-${emoji}`}
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-9 min-w-9 rounded-full border-primary/15 px-0"
                                    onClick={() => appendEmojiToComment(post.id, emoji)}
                                  >
                                    {emoji}
                                  </Button>
                                ))}
                              </div>
                              <Button onClick={() => addComment(post.id)} disabled={submitting} className="h-10 rounded-xl px-4">
                                Comment
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </section>
        </section>
      </main>
      {activeImageUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/88 p-4" onClick={() => setActiveImageUrl(null)}>
          <button
            type="button"
            onClick={() => setActiveImageUrl(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white/5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <img src={activeImageUrl} alt="Expanded community upload" className="max-h-[90vh] w-full object-contain" />
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default Community;
