import { Link, useLocation } from 'react-router-dom'
import { BrassButton } from '../components/BrassButton'

export function NotFoundScreen() {
  const { pathname } = useLocation()

  return (
    <div className="not-found-screen">
      <div className="not-found-overlay" />
      <main>
        <h1>404</h1>
        <p className="not-found-path">{pathname}</p>
        <p>This route does not exist.</p>
        <Link to="/">
          <BrassButton variant="primary">Return to Main Menu</BrassButton>
        </Link>
      </main>
    </div>
  )
}
