





import { useCallback } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useTheme } from "@/hooks/useTheme"
import { GroupSuggestion } from "./suggestion"
// Reuses the same minimal GroupSuggestion shape (id, name, description,
// avatar, slug) — a joined group is rendered the same way as a suggested
// one for now. Split into its own type later if "my groups" starts
// returning extra fields (role, unread count, member count, etc).

interface Props {
  group: GroupSuggestion
  onPress?: (group: GroupSuggestion) => void
}
export interface UserGroupResponse{
  data:{
    groups:{
      name:string,
      cover_image:string,
      description:string,
     

    }
  }
}

export const GroupListItem = ({ group, onPress }: Props) => {
  const theme = useTheme()

  // ── navigate to group ──────────────────────────────────────
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(group)
      return
    }
   router.push({
           pathname:`/community/${group.slug}`,
           params:{
             communityname:group.name,
            communityprivacy:group.privacy,
            is_member:true as unknown as string
            }
             
           })
  }, [group, onPress])
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.background, borderColor: theme.textMuted }]}
      activeOpacity={0.7}
      onPress={handlePress}
    >
       {group.role==="admin" &&(
        <View style={[styles.adminBar,{backgroundColor:theme.background,borderColor: theme.textMuted}]}>
          <Text style={[styles.adminText, { color: theme.success }]} numberOfLines={2}>
           Admin
        </Text>
        </View>
        ) }
        {group.role==="moderator" &&(
        <View style={[styles.adminBar,{backgroundColor:theme.background,borderColor: theme.textMuted}]}>
          <Text style={[styles.adminText, { color: theme.success }]} numberOfLines={2}>
           Moderator
        </Text>
        </View>
        ) }
      <Image
        source={{ uri: group.cover_image ?? "" }}
        style={styles.avatar}
        transition={200}
      />
      <View style={styles.info}>
        
        <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={[styles.description, { color: theme.textMuted }]} numberOfLines={2}>
          {group.description}
        </Text>
       
      </View>
      <Text style={[styles.chevron, { color: theme.textMuted }]}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray[200],
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  description: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  adminText: {
    fontSize: FontSize.xs,
    fontWeight:FontWeight.extrabold    

  },
   adminBar: {
    fontSize: FontSize.sm,
    alignItems:"center",
    justifyContent:"space-between",
    position:"absolute",
    right:5,
    paddingHorizontal:1,
    top:2,
    borderColor:Colors.primaryLight,
    elevation:556,
    borderWidth:2,
    borderRadius:Radius.full

  },
  chevron: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
  },
})
