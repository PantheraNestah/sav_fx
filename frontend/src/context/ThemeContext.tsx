import {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'dash-theme'
const THEME_COLORS: Record<Theme, string> = { dark: '#091321', light: '#f3f8fa' }

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage unavailable (private mode, blocked storage) — fall through
  }
  return null
}

function systemTheme(): Theme {
  try {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  } catch {
    // matchMedia unavailable
  }
  return 'dark'
}

/**
 * Paint the theme onto <html>. Transitions and backdrop filters are suspended
 * for a couple of frames so every layer repaints in the same pass — mobile
 * WebKit/Blink otherwise leave stale composited layers (modal backdrops, blurred
 * toolbars, the chart canvas) half in the old theme.
 */
function applyTheme(theme: Theme, animate: boolean) {
  const root = document.documentElement
  if (root.getAttribute('data-theme') === theme) return

  if (animate) {
    root.classList.add('theme-switching')
  }
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLORS[theme])

  if (animate) {
    // Force a synchronous style/layout flush, then release on the second frame.
    void root.offsetHeight
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root.classList.remove('theme-switching')),
    )
  }
}

export interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

export const ThemeCtx = createContext<ThemeState | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? systemTheme())
  // Once the user picks a theme explicitly we stop following the OS setting.
  const explicit = useRef<boolean>(readStoredTheme() !== null)
  const firstRun = useRef(true)

  useLayoutEffect(() => {
    applyTheme(theme, !firstRun.current)
    firstRun.current = false
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    explicit.current = true
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      // per-viewer convenience only
    }
    setThemeState(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      explicit.current = true
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  // Follow OS-level changes until the user chooses, and sync other tabs.
  useEffect(() => {
    let mql: MediaQueryList | null = null
    const onSystem = (e: MediaQueryListEvent) => {
      if (!explicit.current) setThemeState(e.matches ? 'light' : 'dark')
    }
    try {
      mql = window.matchMedia('(prefers-color-scheme: light)')
      mql.addEventListener('change', onSystem)
    } catch {
      mql = null
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        explicit.current = true
        setThemeState(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      mql?.removeEventListener('change', onSystem)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme, setTheme])

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}
