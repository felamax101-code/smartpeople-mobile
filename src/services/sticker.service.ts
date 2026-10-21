import api from "@/services/api" // <- same client feed.service.ts uses
import { Sticker } from "@/types"

export interface StickerPage {
  data: {
    stickers: Sticker[]
    pagination: { has_next: boolean; page?: number; total?: number }
  }
}

const PAGE_SIZE = 24

// "giphy/abc123" or "user/<uuid>", matches /stickers/mine/<source>/<sticker_id>/
const identity = (s: Pick<Sticker, "source" | "id">) =>
  `${s.source}/${encodeURIComponent(s.id)}`

export const stickerService = {
  trending: async (page = 1): Promise<StickerPage> => {
    const res = await api.get("/stickers/trending/", {
      params: { page, limit: PAGE_SIZE },
    })
    return res.data
  },

  search: async (q: string, page = 1): Promise<StickerPage> => {
    const res = await api.get("/stickers/search/", {
      params: { q, page, limit: PAGE_SIZE },
    })
    return res.data
  },

  // ---- My stickers (favourites) ----
  mine: async (page = 1): Promise<StickerPage> => {
    const res = await api.get("/stickers/mine/", {
      params: { page, limit: PAGE_SIZE },
    })
    return res.data
  },

  // both are idempotent on the server
  save: async (sticker: Sticker): Promise<void> => {
    await api.put(`/stickers/mine/${identity(sticker)}/`)
  },

  unsave: async (sticker: Sticker): Promise<void> => {
    await api.delete(`/stickers/mine/${identity(sticker)}/`)
  },
}