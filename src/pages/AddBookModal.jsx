import { useState, useEffect, useRef } from 'react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const currentYear = new Date().getFullYear()
const currentMonth = MONTHS[new Date().getMonth()]

export default function AddBookModal({ onSave, onClose, existing }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(
    existing
      ? { title: existing.title, author: existing.author, genre: existing.genre, thumbnail: existing.thumbnail }
      : null
  )

  const [title, setTitle] = useState(existing?.title || '')
  const [author, setAuthor] = useState(existing?.author || '')
  const [genre, setGenre] = useState(existing?.genre || '')
  const [thumbnail, setThumbnail] = useState(existing?.thumbnail || '')
  const [rating, setRating] = useState(existing?.rating || 0)
  const [comment, setComment] = useState(existing?.comment || '')
  const [month, setMonth] = useState(existing?.month || currentMonth)
  const [year, setYear] = useState(existing?.year || String(currentYear))
  const [isHeadline, setIsHeadline] = useState(existing?.is_headline || false)
  const [hovered, setHovered] = useState(0)

  const debounceRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (existing || !query.trim() || query.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&langRestrict=en`
        )
        const data = await res.json()
        const books = (data.items || []).map(item => {
          const info = item.volumeInfo
          return {
            id: item.id,
            title: info.title || '',
            author: info.authors?.[0] || '',
            genre: info.categories?.[0] || '',
            thumbnail: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null,
          }
        })
        setSuggestions(books)
        setShowDropdown(books.length > 0)
      } catch (e) {
        console.error('Google Books error', e)
      }
      setSearching(false)
    }, 350)
  }, [query])

  function selectSuggestion(book) {
    setSelected(book)
    setTitle(book.title)
    setAuthor(book.author)
    setGenre(book.genre)
    setThumbnail(book.thumbnail || '')
    setQuery(book.title)
    setShowDropdown(false)
    setSuggestions([])
  }

  function clearSelection() {
    setSelected(null)
    setTitle(''); setAuthor(''); setGenre(''); setThumbnail(''); setQuery('')
  }

  function handleSave(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title, author, genre, thumbnail, rating, comment, month, year, is_headline: isHeadline })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-heading">{existing ? 'Edit book' : 'Log a book'}</h2>
        <form onSubmit={handleSave}>

          {/* Search or selected card */}
          {!selected ? (
            <div className="modal-field" ref={dropdownRef} style={{ position: 'relative' }}>
              <label>Search for a book *</label>
              <div className="search-input-wrap">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Start typing a title or author…"
                  autoComplete="off"
                  autoFocus
                />
                {searching && <span className="search-spinner">⏳</span>}
              </div>
              {showDropdown && (
                <div className="book-dropdown">
                  {suggestions.map(b => (
                    <div key={b.id} className="book-suggestion" onMouseDown={() => selectSuggestion(b)}>
                      {b.thumbnail
                        ? <img src={b.thumbnail} alt="" className="suggestion-thumb" />
                        : <div className="suggestion-thumb-placeholder">📖</div>
                      }
                      <div className="suggestion-info">
                        <p className="suggestion-title">{b.title}</p>
                        {b.author && <p className="suggestion-author">{b.author}</p>}
                        {b.genre && <p className="suggestion-genre">{b.genre}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="selected-book-card">
              {thumbnail
                ? <img src={thumbnail} alt={title} className="selected-thumb" />
                : <div className="selected-thumb-placeholder">📖</div>
              }
              <div className="selected-info">
                <p className="selected-title">{title}</p>
                {author && <p className="selected-author">{author}</p>}
                {genre && <p className="selected-genre">{genre}</p>}
              </div>
              {!existing && (
                <button type="button" className="selected-clear" onClick={clearSelection}>×</button>
              )}
            </div>
          )}

          {/* Rest of form — only shown once book is picked */}
          {(selected || existing) && (
            <>
              <div className="modal-field">
                <label>Genre <span className="label-hint">(auto-filled, feel free to edit)</span></label>
                <input type="text" value={genre} onChange={e => setGenre(e.target.value)} placeholder="Fiction, History…" />
              </div>

              <div className="modal-row">
                <div className="modal-field">
                  <label>Month read</label>
                  <select value={month} onChange={e => setMonth(e.target.value)}>
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="modal-field">
                  <label>Year</label>
                  <input type="text" value={year} onChange={e => setYear(e.target.value)} maxLength={4} placeholder="2025" />
                </div>
              </div>

              <div className="modal-field">
                <label>Rating</label>
                <div className="star-input">
                  {[1,2,3,4,5].map(n => (
                    <span
                      key={n}
                      className={`star-btn ${n <= (hovered || rating) ? 'on' : ''}`}
                      onMouseEnter={() => setHovered(n)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(rating === n ? 0 : n)}
                    >★</span>
                  ))}
                </div>
              </div>

              <div className="modal-field">
                <label>My thoughts</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="What did you think? Favourite moments, feelings, notes…"
                  rows={4}
                />
              </div>

              <div className="modal-field modal-headline-toggle">
                <label className="toggle-label">
                  <input type="checkbox" checked={isHeadline} onChange={e => setIsHeadline(e.target.checked)} />
                  <span>Feature on front page</span>
                </label>
                <p className="toggle-hint">Front page books appear as headlines in your edition</p>
              </div>
            </>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={!selected && !existing}>Save book</button>
          </div>
        </form>
      </div>
    </div>
  )
}