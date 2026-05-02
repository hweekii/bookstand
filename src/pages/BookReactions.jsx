import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const EMOJIS = ['❤️', '😮', '😢', '🔥']

export default function BookReactions({ book, currentUser }) {
  const [reactions, setReactions] = useState([])
  const [comments, setComments] = useState([])
  const [bookmarked, setBookmarked] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [book.id])

  async function fetchAll() {
    const [{ data: r }, { data: c }, { data: b }] = await Promise.all([
      supabase.from('reactions').select('*, profiles(username)').eq('book_id', book.id),
      supabase.from('comments').select('*, profiles(username)').eq('book_id', book.id).order('created_at'),
      currentUser
        ? supabase.from('bookmarks').select('*').eq('book_id', book.id).eq('user_id', currentUser.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    setReactions(r || [])
    setComments(c || [])
    setBookmarked(!!b)
  }

  async function toggleReaction(emoji) {
    if (!currentUser) return
    const existing = reactions.find(r => r.user_id === currentUser.id && r.emoji === emoji)
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('reactions').insert({ book_id: book.id, user_id: currentUser.id, emoji })
    }
    fetchAll()
  }

  async function toggleBookmark() {
    if (!currentUser) return
    if (bookmarked) {
      await supabase.from('bookmarks').delete().eq('book_id', book.id).eq('user_id', currentUser.id)
    } else {
      await supabase.from('bookmarks').insert({ book_id: book.id, user_id: currentUser.id })
    }
    setBookmarked(!bookmarked)
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!commentText.trim() || !currentUser) return
    setLoading(true)
    await supabase.from('comments').insert({
      book_id: book.id,
      user_id: currentUser.id,
      content: commentText.trim(),
    })
    setCommentText('')
    setLoading(false)
    fetchAll()
  }

  async function deleteComment(id) {
    await supabase.from('comments').delete().eq('id', id)
    fetchAll()
  }

  // Group reactions by emoji
  const grouped = EMOJIS.map(emoji => ({
    emoji,
    count: reactions.filter(r => r.emoji === emoji).length,
    mine: currentUser && reactions.some(r => r.emoji === emoji && r.user_id === currentUser.id),
  }))

  return (
    <div className="reactions-wrap">
      {/* Emoji reactions */}
      <div className="emoji-row">
        {grouped.map(({ emoji, count, mine }) => (
          <button
            key={emoji}
            className={`emoji-btn ${mine ? 'mine' : ''}`}
            onClick={() => toggleReaction(emoji)}
            title={currentUser ? '' : 'Sign in to react'}
          >
            {emoji} {count > 0 && <span className="emoji-count">{count}</span>}
          </button>
        ))}

        <button
          className={`bookmark-btn ${bookmarked ? 'bookmarked' : ''}`}
          onClick={toggleBookmark}
          title={bookmarked ? 'Remove from Want to Read' : 'Want to Read'}
        >
          {bookmarked ? '🔖' : '📌'} <span className="emoji-count">{bookmarked ? 'Saved' : ''}</span>
        </button>
      </div>

      {/* Comments toggle */}
      <button className="comments-toggle" onClick={() => setShowComments(!showComments)}>
        {showComments ? 'Hide' : 'Read'} {comments.length > 0 ? `${comments.length} ` : ''}comment{comments.length !== 1 ? 's' : ''}
      </button>

      {showComments && (
        <div className="comments-section">
          {comments.length === 0 && <p className="no-comments">No comments yet. Be the first.</p>}
          {comments.map(c => (
            <div key={c.id} className="comment">
              <div className="comment-header">
                <span className="comment-author">@{c.profiles?.username}</span>
                <span className="comment-time">{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {currentUser?.id === c.user_id && (
                  <button className="comment-delete" onClick={() => deleteComment(c.id)}>×</button>
                )}
              </div>
              <p className="comment-body">{c.content}</p>
            </div>
          ))}

          {currentUser && (
            <form className="comment-form" onSubmit={submitComment}>
              <input
                type="text"
                placeholder="Leave a comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                maxLength={300}
              />
              <button type="submit" disabled={loading || !commentText.trim()}>Post</button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}