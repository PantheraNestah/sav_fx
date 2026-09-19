import { useContext } from 'react'
import { UiCtx } from './UiContext'

export function useUi() {
  const ctx = useContext(UiCtx)
  if (!ctx) throw new Error('useUi must be used within UiProvider')
  return ctx
}
