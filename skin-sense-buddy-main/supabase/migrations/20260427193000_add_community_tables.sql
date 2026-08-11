-- Shared community feature tables (hair + skin communities)

CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_type text NOT NULL CHECK (community_type IN ('hair', 'skin')),
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT 'Community Member',
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('like', 'love')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_reaction_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL)
    OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_reactions_user_post_unique
ON public.community_reactions(user_id, post_id)
WHERE post_id IS NOT NULL AND comment_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_reactions_user_comment_unique
ON public.community_reactions(user_id, comment_id)
WHERE comment_id IS NOT NULL AND post_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_community_posts_type_created
ON public.community_posts(community_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_created
ON public.community_comments(post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_community_comments_parent
ON public.community_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_community_reactions_post
ON public.community_reactions(post_id);

CREATE INDEX IF NOT EXISTS idx_community_reactions_comment
ON public.community_reactions(comment_id);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Community posts are viewable by everyone" ON public.community_posts;
CREATE POLICY "Community posts are viewable by everyone"
ON public.community_posts
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own community posts" ON public.community_posts;
CREATE POLICY "Users can insert their own community posts"
ON public.community_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own community posts" ON public.community_posts;
CREATE POLICY "Users can update their own community posts"
ON public.community_posts
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own community posts" ON public.community_posts;
CREATE POLICY "Users can delete their own community posts"
ON public.community_posts
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Community comments are viewable by everyone" ON public.community_comments;
CREATE POLICY "Community comments are viewable by everyone"
ON public.community_comments
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own community comments" ON public.community_comments;
CREATE POLICY "Users can insert their own community comments"
ON public.community_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own community comments" ON public.community_comments;
CREATE POLICY "Users can update their own community comments"
ON public.community_comments
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own community comments" ON public.community_comments;
CREATE POLICY "Users can delete their own community comments"
ON public.community_comments
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Community reactions are viewable by everyone" ON public.community_reactions;
CREATE POLICY "Community reactions are viewable by everyone"
ON public.community_reactions
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own community reactions" ON public.community_reactions;
CREATE POLICY "Users can insert their own community reactions"
ON public.community_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own community reactions" ON public.community_reactions;
CREATE POLICY "Users can update their own community reactions"
ON public.community_reactions
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own community reactions" ON public.community_reactions;
CREATE POLICY "Users can delete their own community reactions"
ON public.community_reactions
FOR DELETE
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_community_posts_updated_at ON public.community_posts;
CREATE TRIGGER update_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_community_comments_updated_at ON public.community_comments;
CREATE TRIGGER update_community_comments_updated_at
BEFORE UPDATE ON public.community_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_community_reactions_updated_at ON public.community_reactions;
CREATE TRIGGER update_community_reactions_updated_at
BEFORE UPDATE ON public.community_reactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
