import api from "./api"
import { Notification, PaginatedResponse } from "@/types"

export const notificationService = {

  getNotifications: async (
    page = 1,
    isRead?: boolean
    
    
  ): Promise<PaginatedResponse<Notification>> => {
    const params: Record<string, any> = { page }
    if (isRead !== undefined) params.is_read = isRead
    const { data } = await api.get("/notifications/", { params })
    return data
  },

  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/`)
  },

  markAllRead: async (): Promise<void> => {
    await api.patch("/notifications/")
  },

  deleteOne: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}/`)
  },

  deleteAll: async (): Promise<void> => {
    await api.delete("/notifications/")
  },

  getUnreadCount: async (): Promise<number> => {
    const data = await notificationService.getNotifications(1, false)
    return data.count
  },
}





















