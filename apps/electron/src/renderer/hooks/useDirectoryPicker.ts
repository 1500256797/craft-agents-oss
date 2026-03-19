import { useState, useCallback } from 'react'
import { RPC_CHANNELS } from '@zhangyuge-agent/shared/protocol'
import { useTransportConnectionState } from './useTransportConnectionState'
import { toast } from 'sonner'

type ServerBrowserMode = 'browse' | 'manual'

interface DirectoryPickerResult {
  pickDirectory: () => void
  showServerBrowser: boolean
  serverBrowserMode: ServerBrowserMode
  cancelServerBrowser: () => void
  confirmServerBrowser: (path: string) => void
  isRemote: boolean
}

export function useDirectoryPicker(
  onSelect: (path: string) => void
): DirectoryPickerResult {
  const transport = useTransportConnectionState()
  const isRemote = transport?.mode === 'remote'
  const canBrowse = isRemote &&
    window.electronAPI.isChannelAvailable(RPC_CHANNELS.fs.LIST_DIRECTORY)

  const [showServerBrowser, setShowServerBrowser] = useState(false)

  const serverBrowserMode: ServerBrowserMode = canBrowse ? 'browse' : 'manual'

  const pickDirectory = useCallback(async () => {
    if (isRemote) {
      setShowServerBrowser(true)
      return
    }

    try {
      const path = await window.electronAPI.openFolderDialog()
      if (path) onSelect(path)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to open folder picker', {
        description: message,
      })
    }
  }, [isRemote, onSelect])

  const cancelServerBrowser = useCallback(() => {
    setShowServerBrowser(false)
  }, [])

  const confirmServerBrowser = useCallback((path: string) => {
    setShowServerBrowser(false)
    onSelect(path)
  }, [onSelect])

  return {
    pickDirectory,
    showServerBrowser,
    serverBrowserMode,
    cancelServerBrowser,
    confirmServerBrowser,
    isRemote,
  }
}
