




import api from "./api"

export interface VerificationStatus {
  identity_status: string | null
  id_type: string | null
  document_expiry_date: string | null
  identity_rejection_reason: string | null
  identity_reviewed_at: string | null
  identity_is_expired: boolean
  attempts_remaining_identity: number
  business_status: string | null
  business_name: string | null
  rc_number: string | null
  business_rejection_reason: string | null
  business_reviewed_at: string | null
  attempts_remaining_business: number
  updated_at: string
}

export interface VerificationOverview {
  verification_level: number
  badge: {
    label: string | null
    color: string | null
    icon: string | null
  }
  data: VerificationStatus | null
}

export const verificationService = {

  getStatus: async (): Promise<VerificationOverview> => {
    const { data } = await api.get("/users/me/verification/")
    return data
  },

  submitIdentity: async (payload: {
    id_type: string
    id_number: string
    id_front: { uri: string; name: string; type: string }
    id_back?: { uri: string; name: string; type: string } | null
    selfie: { uri: string; name: string; type: string }
    document_expiry_date?: string | null
  }): Promise<{ success: boolean; attempts_remaining: number }> => {
    // build FormData â€” sends actual files to Django
    const formData = new FormData()
    formData.append("id_type", payload.id_type)
    formData.append("id_number", payload.id_number)

    // append files
    formData.append("id_front", payload.id_front as any)
    formData.append("selfie", payload.selfie as any)

    if (payload.id_back) {
      formData.append("id_back", payload.id_back as any)
    }

    if (payload.document_expiry_date) {
      formData.append("document_expiry_date", payload.document_expiry_date)
    }

    const { data } = await api.post(
      "/users/me/verification/identity/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )
    return data
  },

  submitBusiness: async (payload: {
    business_name: string
    rc_number: string
    business_address: string
    cac_document: { uri: string; name: string; type: string }
  }): Promise<{ success: boolean; attempts_remaining: number }> => {
    const formData = new FormData()
    formData.append("business_name", payload.business_name)
    formData.append("rc_number", payload.rc_number)
    formData.append("business_address", payload.business_address)
    formData.append("cac_document", payload.cac_document as any)

    const { data } = await api.post(
      "/users/me/verification/business/",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    )
    return data
  },
}







