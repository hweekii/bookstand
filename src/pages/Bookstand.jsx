import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import AddBookModal from './AddBookModal'
import AddToWishlistModal from './AddtoWishlistModal'
import BookReactions from './BookReactions'

function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

function groupByEdition(books) {
  const map = {}
  books.forEach(b => {
    const key = `${b.month} ${b.year}`
    if (!map[key]) map[key] = { month: b.month, year: b.year, books: [] }
    map[key].books.push(b)
  })
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return Object.values(map).sort((a, b) => {
    if (b.year !== a.year) return Number(b.year) - Number(a.year)
    return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month)
  })
}

function StoryActions({ book, onEdit, onDelete, isOwn }) {
  if (!isOwn) return null
  return (
    <div className="story-actions">
      <button className="btn-edit" onClick={() => onEdit(book)}>Edit</button>
      <button className="btn-delete" onClick={() => onDelete(book.id)}>Delete</button>
    </div>
  )
}

export default function Bookstand({ profileUser, currentUser, onNavigate }) {
  const [books, setBooks] = useState([])
  const [editions, setEditions] = useState([])
  const [activeEdition, setActiveEdition] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showWishlistModal, setShowWishlistModal] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [hoveredEdition, setHoveredEdition] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [wishlist, setWishlist] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [toast, setToast] = useState('')

  const isOwn = currentUser?.id === profileUser?.id

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  useEffect(() => {
    fetchBooks()
    if (isOwn) { fetchWishlist(); fetchBookmarks() }
    if (!isOwn && currentUser) checkFollow()
  }, [profileUser?.id])

  async function fetchBooks() {
    const { data } = await supabase
      .from('books').select('*')
      .eq('user_id', profileUser.id)
      .order('created_at', { ascending: false })
    const all = data || []
    setBooks(all)
    const grouped = groupByEdition(all)
    setEditions(grouped)
    if (grouped.length > 0) setActiveEdition(grouped[0])
  }

  async function fetchWishlist() {
    const { data } = await supabase.from('want_to_read').select('*')
      .eq('user_id', currentUser.id).order('created_at', { ascending: false })
    setWishlist(data || [])
  }

  async function fetchBookmarks() {
    const { data } = await supabase.from('bookmarks')
      .select('*, books(title, author, genre, thumbnail)')
      .eq('user_id', currentUser.id).order('created_at', { ascending: false })
    setBookmarks(data || [])
  }

  async function checkFollow() {
    const { data } = await supabase.from('follows').select('*')
      .eq('follower_id', currentUser.id).eq('following_id', profileUser.id).maybeSingle()
    setIsFollowing(!!data)
  }

  async function toggleFollow() {
    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUser.id).eq('following_id', profileUser.id)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profileUser.id })
    }
    setIsFollowing(!isFollowing)
  }

  async function saveBook(data) {
    const currentFavourites = books.filter(b => b.is_headline)
    const isEditing = !!editingBook
    const wasAlreadyFavourite = editingBook?.is_headline

    // Enforce max 3 favourites
    if (data.is_headline && !wasAlreadyFavourite && currentFavourites.length >= 3) {
      showToast('You can only have 3 all-time favourites. Remove one first to add another.')
      return
    }

    if (isEditing) {
      await supabase.from('books').update(data).eq('id', editingBook.id)
    } else {
      await supabase.from('books').insert({ ...data, user_id: currentUser.id })
    }
    setShowModal(false); setEditingBook(null); fetchBooks()
  }

  async function deleteBook(id) {
    if (!confirm('Delete this book?')) return
    await supabase.from('books').delete().eq('id', id)
    fetchBooks()
  }

  async function saveToWishlist(data) {
    await supabase.from('want_to_read').insert({ ...data, user_id: currentUser.id })
    setShowWishlistModal(false); fetchWishlist()
  }

  async function removeFromWishlist(id) {
    await supabase.from('want_to_read').delete().eq('id', id); fetchWishlist()
  }

  async function removeBookmark(bookId) {
    await supabase.from('bookmarks').delete()
      .eq('book_id', bookId).eq('user_id', currentUser.id)
    fetchBookmarks()
  }

  // Max 3 all-time favourites
  const favourites = books.filter(b => b.is_headline).slice(0, 3)
  const editionBooks = activeEdition?.books || []
  const wantToReadTotal = wishlist.length + bookmarks.length
  const hasContent = books.length > 0 || wantToReadTotal > 0

  return (
    <div className="gazette-wrap">

      {/* ── TOAST ── */}
      {toast && (
        <div className="toast">
          <span className="toast-icon">✦</span>
          {toast}
        </div>
      )}

      {/* ── MASTHEAD ── */}
      <header className="masthead">
        <div className="masthead-meta">
          <span>Est. {profileUser?.created_at ? new Date(profileUser.created_at).getFullYear() : '—'}</span>
          <span>{books.length} book{books.length !== 1 ? 's' : ''} read</span>
          <span>{favourites.length} / 3 favourites</span>
        </div>
        <h1 className="masthead-title">{profileUser?.username}'s <em>Bookstand</em></h1>
        <div className="masthead-rule"><span>◆ Personal Reading Log ◆</span></div>

        <div className="masthead-actions">
          {isOwn ? (
            <>
              <button className="btn-primary" onClick={() => { setEditingBook(null); setShowModal(true) }}>
                + Log a book
              </button>
              <button className="btn-ghost" onClick={() => setShowWishlistModal(true)}>
                + Want to Read
              </button>
            </>
          ) : currentUser ? (
            <button className={`btn-follow ${isFollowing ? 'following' : ''}`} onClick={toggleFollow}>
              {isFollowing ? '✓ Following' : '+ Follow'}
            </button>
          ) : null}
          {!isOwn && (
            <button className="btn-ghost" onClick={() => onNavigate('friends')}>← Back</button>
          )}
        </div>
      </header>

      {!hasContent ? (
        <div className="empty-gazette">
          <p className="empty-icon">📰</p>
          <p className="empty-text">{isOwn ? 'No books yet. Log your first one!' : 'No books logged yet.'}</p>
        </div>
      ) : (
        <>
          {/* ── ALL-TIME FAVOURITES ── */}
          {favourites.length > 0 && (
            <section className="front-section">
              <div className="front-section-header">
                <div className="section-rule">
                  <span className="section-rule-label">All-Time Favourites</span>
                </div>
              </div>

              {/* Equal-size grid — 1, 2 or 3 columns depending on count */}
              <div className={`fav-grid fav-grid--${favourites.length}`}>
                {favourites.map((b, i) => (
                  <article key={b.id} className={`fav-card ${i === 0 ? 'fav-card--lead' : ''}`}>
                    {b.genre && <span className="story-kicker">{b.genre}</span>}
                    <h2 className="fav-title">{b.title}</h2>
                    {b.author && <p className="story-byline">By {b.author}</p>}
                    {b.thumbnail && (
                      <img src={b.thumbnail} alt={b.title} className="fav-cover" />
                    )}
                    {b.comment && <p className="fav-comment">{b.comment}</p>}
                    <StoryActions
                      book={b}
                      onEdit={b => { setEditingBook(b); setShowModal(true) }}
                      onDelete={deleteBook}
                      isOwn={isOwn}
                    />
                  </article>
                ))}
              </div>
            </section>
          )}

          {isOwn && favourites.length === 0 && books.length > 0 && (
            <p className="no-headlines-hint" style={{ padding: '1.5rem 2.5rem' }}>
              No all-time favourites yet — tick "All-time favourite" when logging a book to feature it here.
            </p>
          )}

          {/* ── READING LOG — EDITIONS IN SIDEBAR ── */}
          {editions.length > 0 && (
            <>
              <div style={{ padding: '0 2.5rem' }}>
                <div className="section-rule">
                  <span className="section-rule-label">Reading Log</span>
                </div>
              </div>

              <div className="stand">
                <aside className="sidebar">
                  <div className="sidebar-inner">
                    {editions.map(ed => {
                      const edKey = `${ed.month} ${ed.year}`
                      const isActive = activeEdition && `${activeEdition.month} ${activeEdition.year}` === edKey

                      return (
                        <div
                          key={edKey}
                          className={`edition-tab ${isActive ? 'active' : ''}`}
                          onClick={() => setActiveEdition(ed)}
                          onMouseEnter={() => setHoveredEdition(edKey)}
                          onMouseLeave={() => setHoveredEdition(null)}
                        >
                          <div className="edition-tab-label">
                            <span className="edition-month">{ed.month.slice(0, 3)}</span>
                            <span className="edition-year">{ed.year}</span>
                          </div>

                          {hoveredEdition === edKey && ed.books.length > 0 && (
                            <div className="flyout">
                              <div className="flyout-heading">
                                {ed.month} {ed.year} — {ed.books.length} book{ed.books.length !== 1 ? 's' : ''}
                              </div>
                              {ed.books.map(b => (
                                <div key={b.id} className="flyout-book">
                                  <div className="flyout-book-title">{b.title}</div>
                                  {b.author && <div className="flyout-book-author">{b.author}</div>}
                                  {b.rating > 0 && <div className="flyout-stars">{stars(b.rating)}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </aside>

                <main className="spread">
                  {activeEdition && (
                    <>
                      <div className="edition-header">
                        <span className="edition-header-name">{activeEdition.month} {activeEdition.year}</span>
                        <span className="edition-header-count">
                          {editionBooks.length} book{editionBooks.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {editionBooks.length > 0 ? (
                        <div className="bottom-strip">
                          {editionBooks.map(b => (
                            <div key={b.id} className="strip-item">
                              {b.thumbnail && <img src={b.thumbnail} alt={b.title} className="strip-cover" />}
                              {b.genre && <span className="strip-label">{b.genre}</span>}
                              <p className="strip-title">{b.title}</p>
                              {b.author && <p className="strip-author">{b.author}</p>}
                              {b.rating > 0 && <p className="strip-stars">{stars(b.rating)}</p>}
                              {b.comment && <p className="strip-comment">{b.comment}</p>}
                              <BookReactions book={b} currentUser={currentUser} />
                              <StoryActions
                                book={b}
                                onEdit={b => { setEditingBook(b); setShowModal(true) }}
                                onDelete={deleteBook}
                                isOwn={isOwn}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-headlines-hint">Nothing logged for this period.</p>
                      )}
                    </>
                  )}
                </main>
              </div>
            </>
          )}

          {/* ── WANT TO READ SHELF ── */}
          {isOwn && wantToReadTotal > 0 && (
            <section className="wtr-shelf">
              <div className="wtr-shelf-header">
                <div className="section-rule">
                  <span className="section-rule-label">📌 Want to Read — {wantToReadTotal} book{wantToReadTotal !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="wtr-grid">
                {wishlist.map(b => (
                  <div key={b.id} className="wtr-card">
                    <div className="wtr-card-source">My list</div>
                    {b.thumbnail
                      ? <img src={b.thumbnail} alt={b.title} className="wtr-cover" />
                      : <div className="wtr-cover-placeholder">📖</div>
                    }
                    <div className="wtr-info">
                      <p className="wtr-title">{b.title}</p>
                      {b.author && <p className="wtr-author">{b.author}</p>}
                      {b.genre && <p className="wtr-genre">{b.genre}</p>}
                    </div>
                    <button className="wtr-remove" onClick={() => removeFromWishlist(b.id)}>×</button>
                  </div>
                ))}
                {bookmarks.map(bm => {
                  const b = bm.books
                  if (!b) return null
                  return (
                    <div key={bm.book_id} className="wtr-card wtr-card-bookmarked">
                      <div className="wtr-card-source">Bookmarked</div>
                      {b.thumbnail
                        ? <img src={b.thumbnail} alt={b.title} className="wtr-cover" />
                        : <div className="wtr-cover-placeholder">📖</div>
                      }
                      <div className="wtr-info">
                        <p className="wtr-title">{b.title}</p>
                        {b.author && <p className="wtr-author">{b.author}</p>}
                        {b.genre && <p className="wtr-genre">{b.genre}</p>}
                      </div>
                      <button className="wtr-remove" onClick={() => removeBookmark(bm.book_id)}>×</button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      {showModal && (
        <AddBookModal
          existing={editingBook}
          onSave={saveBook}
          onClose={() => { setShowModal(false); setEditingBook(null) }}
        />
      )}
      {showWishlistModal && (
        <AddToWishlistModal
          onSave={saveToWishlist}
          onClose={() => setShowWishlistModal(false)}
        />
      )}
    </div>
  )
}