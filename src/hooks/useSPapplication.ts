// services/propertyApplication.service.ts

import api from "@/services/api" // your existing configured axios instance

export interface ApplicationPayload {
  applicant_type: "personal" | "organization"
  name: string
}

export interface ApplicationStatusResponse {
  has_applied: boolean
  can_post_listings: boolean
  application: {
    id: number
    applicant_type: "personal" | "organization"
    name: string
    status: "pending" | "approved" | "rejected"
    rejection_reason: string
    created_at: string
    updated_at: string
  } | null
}

export const propertyApplicationService = {
  submit: async (payload: ApplicationPayload) => {
    const response = await api.post("/sp/applications/", payload)
    return response.data
  },

  getMyStatus: async (): Promise<ApplicationStatusResponse> => {
    const response = await api.get("/sp/applications/me/")
    return response.data
  },
}