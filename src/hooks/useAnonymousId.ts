import * as Crypto from "expo-crypto"
import AsyncStorage from "@react-native-async-storage/async-storage"

const KEY = "anon_id"
let pending: Promise<string> | null = null

export function getAnonId(): Promise<string> {
  if (!pending) {
    pending = (async () => {
      let id = await AsyncStorage.getItem(KEY)
      if (!id) {
        id = Crypto.randomUUID()
        await AsyncStorage.setItem(KEY, id)
      }
      return id
    })()
  }
  return pending
}

export async function clearAnonId() {
  pending = null
  await AsyncStorage.removeItem(KEY)
}