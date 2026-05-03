import { useState, useEffect, useRef } from 'react'

export default function AddToWishlistModal({ onSave, onClose }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)

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
    if (!query.trim() || query.length < 2) {
      setSuggestions([]); setShowDropdown(false); return
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
      } catch (e) { console.error(e) }
      setSearching(false)
    }, 350)
  }, [query])

  function selectSuggestion(book) {
    setSelected(book)
    setQuery(book.title)
    setShowDropdown(false)
    setSuggestions([])
  }

  function handleSave(e) {
    e.preventDefault()
    if (!selected) return
    onSave({
      title: selected.title,
      author: selected.author,
      genre: selected.genre,
      thumbnail: selected.thumbnail,
      google_books_id: selected.id,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-heading">Add to Want to Read</h2>
        <form onSubmit={handleSave}>

          {!selected ? (
            <div className="modal-field" ref={dropdownRef} style={{ position: 'relative' }}>
              <label>Search for a book</label>
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
              {selected.thumbnail
                ? <img src={selected.thumbnail} alt={selected.title} className="selected-thumb" />
                : <div className="selected-thumb-placeholder">📖</div>
              }
              <div className="selected-info">
                <p className="selected-title">{selected.title}</p>
                {selected.author && <p className="selected-author">{selected.author}</p>}
                {selected.genre && <p className="selected-genre">{selected.genre}</p>}
              </div>
              <button type="button" className="selected-clear" onClick={() => { setSelected(null); setQuery('') }}>×</button>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={!selected}>Add to list</button>
          </div>
        </form>
      </div>
    </div>
  )
}