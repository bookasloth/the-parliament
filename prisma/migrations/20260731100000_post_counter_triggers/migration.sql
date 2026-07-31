-- Denormalized Post counters (upvote_count/downvote_count/comment_count/share_count)
-- are now maintained at the DB level by triggers on their source tables, so they
-- cannot drift regardless of which code path writes. App code no longer touches them.
--
-- Count rules mirror the app's prior logic:
--   upvote_count   = reactions on the post with type IN ('upvote','like')
--   downvote_count = reactions on the post with type = 'downvote'
--   comment_count  = non-deleted comments (deleted_at IS NULL)
--   share_count    = rows in post_shares

CREATE OR REPLACE FUNCTION recompute_post_counts(p_post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET
    upvote_count = (SELECT count(*) FROM reactions
                    WHERE entity_type = 'post' AND entity_id = p_post_id
                      AND type IN ('upvote', 'like')),
    downvote_count = (SELECT count(*) FROM reactions
                      WHERE entity_type = 'post' AND entity_id = p_post_id
                        AND type = 'downvote'),
    comment_count = (SELECT count(*) FROM comments
                     WHERE post_id = p_post_id AND deleted_at IS NULL),
    share_count = (SELECT count(*) FROM post_shares
                   WHERE original_post_id = p_post_id)
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- reactions are polymorphic (entity_type/entity_id); only recompute for posts.
CREATE OR REPLACE FUNCTION trg_reactions_post_counts()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.entity_type = 'post' THEN
    PERFORM recompute_post_counts(OLD.entity_id);
  END IF;
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.entity_type = 'post' THEN
    PERFORM recompute_post_counts(NEW.entity_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reactions_post_counts ON reactions;
CREATE TRIGGER reactions_post_counts
AFTER INSERT OR UPDATE OR DELETE ON reactions
FOR EACH ROW EXECUTE FUNCTION trg_reactions_post_counts();

CREATE OR REPLACE FUNCTION trg_comments_post_counts()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_post_counts(OLD.post_id);
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM recompute_post_counts(NEW.post_id);
  ELSE  -- UPDATE (e.g. soft-delete toggling deleted_at, or a post_id change)
    PERFORM recompute_post_counts(NEW.post_id);
    IF NEW.post_id <> OLD.post_id THEN
      PERFORM recompute_post_counts(OLD.post_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comments_post_counts ON comments;
CREATE TRIGGER comments_post_counts
AFTER INSERT OR UPDATE OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION trg_comments_post_counts();

CREATE OR REPLACE FUNCTION trg_post_shares_counts()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_post_counts(OLD.original_post_id);
  ELSE
    PERFORM recompute_post_counts(NEW.original_post_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_shares_counts ON post_shares;
CREATE TRIGGER post_shares_counts
AFTER INSERT OR UPDATE OR DELETE ON post_shares
FOR EACH ROW EXECUTE FUNCTION trg_post_shares_counts();

-- One-time reconciliation: correct any drift that accumulated before triggers existed.
UPDATE posts p SET
  upvote_count = (SELECT count(*) FROM reactions WHERE entity_type = 'post' AND entity_id = p.id AND type IN ('upvote','like')),
  downvote_count = (SELECT count(*) FROM reactions WHERE entity_type = 'post' AND entity_id = p.id AND type = 'downvote'),
  comment_count = (SELECT count(*) FROM comments WHERE post_id = p.id AND deleted_at IS NULL),
  share_count = (SELECT count(*) FROM post_shares WHERE original_post_id = p.id);
