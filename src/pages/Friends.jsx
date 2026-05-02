import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Friends({ currentUser, onViewStand }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [following, setFollowing] = useState([])
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetchFollowing()
  }, [])

  async function fetchFollowing() {
    const { data } = await supabase
      .from('follows')
      .select('following_id, profiles!follows_following_id_fkey(id, username)')
      .eq('follower_id', currentUser.id)
    setFollowing(data?.map(f => f.profiles) || [])
  }

  async function search(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setNotFound(false)
    setResults([])

    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', currentUser.id)
      .limit(10)

    setSearching(false)
    if (!data || data.length === 0) setNotFound(true)
    else setResults(data)
  }

  async function toggleFollow(profile) {
    const isF = following.some(f => f.id === profile.id)
    if (isF) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id)
      setFollowing(following.filter(f => f.id !== profile.id))
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUser.id,
        following_id: profile.id,
      })
      setFollowing([...following, profile])
    }
  }

  function ProfileRow({ profile }) {
    const isF = following.some(f => f.id === profile.id)
    return (
      <div className="friend-row">
        <div className="friend-avatar">{profile.username[0].toUpperCase()}</div>
        <div className="friend-info">
          <span className="friend-username">@{profile.username}</span>
        </div>
        <div className="friend-actions">
          <button className="btn-view" onClick={() => onViewStand(profile)}>View stand</button>
          <button
            className={`btn-follow-sm ${isF ? 'following' : ''}`}
            onClick={() => toggleFollow(profile)}
          >
            {isF ? '✓ Following' : '+ Follow'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="friends-page">
      <div className="friends-header">
        <h2 className="friends-title">Find a reader</h2>
        <p className="friends-sub">Search by username to discover friends' bookstands</p>
      </div>

      <form className="search-form" onSubmit={search}>
        <input
          type="text"
          placeholder="Search username…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-btn" disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {notFound && <p className="search-empty">No readers found for "{query}".</p>}

      {results.length > 0 && (
        <div className="friend-list">
          <p className="friend-list-label">Results</p>
          {results.map(p => <ProfileRow key={p.id} profile={p} />)}
        </div>
      )}

      <div className="friend-list" style={{ marginTop: '2rem' }}>
        <p className="friend-list-label">Following — {following.length}</p>
        {following.length === 0 && <p className="search-empty">You're not following anyone yet.</p>}
        {following.map(p => <ProfileRow key={p.id} profile={p} />)}
      </div>
    </div>
  )
}