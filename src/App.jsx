import { useState, useEffect } from 'react'
import { supabase } from '/supabase'
import Auth from '/pages/Auth'
import Bookstand from '/pages/Bookstand'
import Friends from '/pages/Friends'
import '/App.css'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)   // profile row
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('stand')              // 'stand' | 'friends' | 'friend-stand'
  const [viewingProfile, setViewingProfile] = useState(null)

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setCurrentUser(profile)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        setPage('stand')
        setViewingProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setPage('stand')
    setViewingProfile(null)
  }

  function handleViewFriendStand(profile) {
    setViewingProfile(profile)
    setPage('friend-stand')
  }

  function handleNavigate(dest) {
    setPage(dest)
    if (dest !== 'friend-stand') setViewingProfile(null)
  }

  if (loading) {
    return (
      <div className="app-loading">
        <p>Opening the Bookstand...</p>
      </div>
    )
  }

  if (!currentUser) {
    return <Auth onAuth={setCurrentUser} />
  }

  return (
    <div className="app">
      {/* Top nav */}
      <nav className="top-nav">
        <button
          className={`nav-btn ${page === 'stand' ? 'active' : ''}`}
          onClick={() => handleNavigate('stand')}
        >
          My Stand
        </button>
        <button
          className={`nav-btn ${page === 'friends' || page === 'friend-stand' ? 'active' : ''}`}
          onClick={() => handleNavigate('friends')}
        >
          Friends
        </button>
        <div className="nav-spacer" />
        <span className="nav-user">@{currentUser.username}</span>
        <button className="nav-signout" onClick={handleSignOut}>Sign out</button>
      </nav>

      {/* Pages */}
      {page === 'stand' && (
        <Bookstand
          profileUser={currentUser}
          currentUser={currentUser}
          onNavigate={handleNavigate}
        />
      )}
      {page === 'friends' && (
        <Friends
          currentUser={currentUser}
          onViewStand={handleViewFriendStand}
        />
      )}
      {page === 'friend-stand' && viewingProfile && (
        <Bookstand
          profileUser={viewingProfile}
          currentUser={currentUser}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  )
}