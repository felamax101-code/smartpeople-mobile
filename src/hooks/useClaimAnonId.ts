import { getAnonId, clearAnonId } from "@/hooks/useAnonymousId"
import api from "@/services/api"
export async function claimAnonHistory() {
  try {
    const anon_id = await getAnonId()
    await api.post("/feed/claim/", { anon_id })   // your Django axios instance
    await clearAnonId()                           // the account owns the history now
  } catch { /* offline: it will just stay as a guest id until next time */ }
}