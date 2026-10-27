// DraftsList.tsx

import {View,Text,TouchableOpacity} from "react-native"
import { useDraftStore,PostDraft } from "@/hooks/drafts.store"
import { Spacing,Radius,FontSize } from "@/constants/colors"
import { useTheme } from "@/hooks/useTheme"
import { MaterialCommunityIcons } from "@expo/vector-icons"

export const DraftsList = ({ onResume,screen ,community_slug}: { onResume: (d: PostDraft) => void ,screen:"feed"|"sp"|"community",community_slug?:string|null}) => {
  const theme = useTheme()
  const { drafts, removeDraft } = useDraftStore()
  const resolvedDrafts=drafts.filter((d)=>d.screen===screen)
  if (!resolvedDrafts.length) return null
  return (
    <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
      <Text style={{ color: theme.textPrimary, fontWeight: "700" }}>Unfinished posts</Text>
      {resolvedDrafts.map((d) => (
        <View key={d.id} style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm,
          padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => onResume(d)}>
            <Text style={{ color: theme.textPrimary }} numberOfLines={1}>
              {d.form.name.slice(0,11) || d.form.description.slice(0,11) || `${d.mediaType} post`}
            </Text>
            <Text style={{ color: d.reason === "upload_failed" ? theme.error : theme.textMuted, fontSize: FontSize.xs }}>
              {d.reason === "upload_failed" ? "Upload failed. Tap to retry" : "Draft"} ·{" "}
              {new Date(d.updatedAt).toLocaleString()}
            </Text>
          </TouchableOpacity> 
          <TouchableOpacity onPress={() => removeDraft(d.id)}>
            <MaterialCommunityIcons name="trash-can-outline" size={22} color={theme.ALLwarning} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  )
}