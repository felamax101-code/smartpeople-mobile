import { useCallback, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native"
import { Image } from "expo-image"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useRouter } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { communityservice } from "@/services/community.sevice"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/stores/auth.store"
const { width: SCREEN_WIDTH } = Dimensions.get("window")
import { BannerType } from "../activityIndicator/AnimatedBanner"
const CARD_WIDTH = SCREEN_WIDTH * 0.42

// Minimal shape for a suggested group — avatar, name, description
export interface GroupSuggestion {
  id: string
  name: string
  description: string
  cover_image: string | null
  members_count: number
  role: "admin" | "moderator" | "member"
  is_member: boolean
  privacy: string
  slug?: string

}export interface CommunityInfo extends GroupSuggestion {
  rules: string[]
}

interface Props {
  groups: any
  title?: string
  onGroupPress?: (group: GroupSuggestion) => void
  onClose?: () => void
  showBanner?:(type:BannerType,mesaage:string)=>void
}

export const GroupSuggestions = ({
  groups,
  title = "Groups you might like",
  onGroupPress,
  onClose,
  showBanner,
}: Props) => {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const router=useRouter()
  const [joining, setJoining] = useState<boolean>(false)
  const [requesting, setRequesting] = useState<boolean>(false)
  const [viewingGroup, setViewingGroup] = useState<boolean>(false)
  const [groupBeingJoined, setgroupBeingJoined] = useState<string>("")
  const handleJoin = async (group: GroupSuggestion) => {
    setJoining(true)
    setgroupBeingJoined(group.id)
    try {
      const data = await communityservice.joingroup(group.slug ?? "")

      if (data.message === "success") {
        showBanner? showBanner("success",`Joined ${group.name}`):null
        queryClient.invalidateQueries({ queryKey: ["groups", "suggestions", user] })
        queryClient.invalidateQueries({ queryKey: ["groups", "mine", user] })
        if (group.privacy==="public" ) 
        router.push({
          pathname: `/community/${group.slug}` as any,
          params: {
            communityname: group.name,
            communityprivacy: group.privacy,
            is_member: "true"
          }

        })
      }


    }

    catch {
      showBanner? showBanner("error","Something went wrong.Try again"):null
      setJoining(false)
    }
    finally {
      setJoining(false)
    }
  }

  const handleRequestToJoin=async(group:GroupSuggestion)=>{

    setRequesting(true)
    setgroupBeingJoined(group.id)
    try {
      const data = await communityservice.joinGroupRequest(group.slug ?? "")
      if (data.message === "success") {
        showBanner? showBanner("success",`Request sent.You will be notified when accepted`):null;
        queryClient.invalidateQueries({ queryKey: ["groups", "suggestions", user] });
        queryClient.invalidateQueries({queryKey: ["groups", "requests", user] }) ;
      }
    }

    catch {
      showBanner? showBanner("error","Something went wrong.Try again"):null
      setJoining(false)
    }
    finally {
      setRequesting(false)
    }

  }

  // ── navigate to group ──────────────────────────────────────
  const handlePress = useCallback(
    (group: GroupSuggestion) => {
      setViewingGroup(true)
      if (onGroupPress) {
        onGroupPress(group)

        return
      }
      if (group.privacy==="public" )
      router.push({
        pathname: `/community/${group.slug}` as any,
        params: {
          communityname: group.name,
          communityprivacy: group.privacy,
          is_member: group.is_member as unknown as string

        }

      })
    },
    [onGroupPress]
  )

  if (!groups.length) return null
  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceSecondary }]}>
     
      <View style={styles.header}>
        <View style={[{ flexDirection: "row", alignItems: "center" }]}>
          <Text style={styles.headerIcon}>👥</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
        </View>
        <View><TouchableOpacity onPress={onClose} ><Text style={[styles.bannerClose, { color: theme.textPrimary }]}>✕</Text></TouchableOpacity></View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {groups.map((group: GroupSuggestion) => (
          <View
            key={group.id}
            style={[styles.card, { backgroundColor: theme.background }]}
          >
            <TouchableOpacity
              onPress={() => handlePress(group)}
              activeOpacity={0.08}
            >
              {group.cover_image === null
                ? <Text style={[styles.avatar, { color: Colors.primary }]}>
                  <MaterialCommunityIcons
                    name="account-group"
                    size={35}
                  /> </Text>
                : <Image
                  source={{ uri: group.cover_image ?? "" }}
                  style={styles.avatar}
                  transition={200}
                />}


              <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
                {group.name}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.description, { color: theme.textMuted }]} numberOfLines={2}>
              {group.description}
            </Text>
            <Text style={[styles.membercount, { color: theme.success }]} >
              {group.privacy === "public" ?
                "Public"
                : group.privacy === "private"
                  ? "Private"
                  : "Invite Only"}
            </Text>
            <Text style={[styles.membercount, { color: theme.success }]} >
              {group.members_count} members
            </Text>
            {group.privacy === "public" ? (
              <TouchableOpacity onPress={() => handleJoin(group)} style={styles.ctaButton}>
                <View>
                  <Text disabled={joining} style={styles.ctaText}>{(joining && groupBeingJoined === group.id) ? "Joining" : "Join"}</Text>
                </View>
              </TouchableOpacity>
            ) : group.privacy === "private" ? (
              <TouchableOpacity onPress={() => handleRequestToJoin(group)} style={styles.ctaButton}>
                <View>
                  <Text style={styles.ctaText}>{(requesting && groupBeingJoined === group.id) ? "Requesting" : "Request to join"}</Text>
                </View>
              </TouchableOpacity>
            ) : (

              <View style={styles.ctaButton}>
                <Text style={styles.ctaText}>Invite Only</Text>
              </View>
            )
            }
            {group.privacy==="public" && (

              <TouchableOpacity onPress={() => handlePress(group)} style={styles.ctaButton}>
              <View >
                <Text disabled={viewingGroup} style={styles.ctaText}>{viewingGroup ? "Viewing Group" : "View group"}</Text>
              </View>
            </TouchableOpacity>
            ) }
            
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    borderRadius: Radius.md,
    marginBottom: 8,
    paddingVertical: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerIcon: {
    fontSize: 15,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Radius.md,
    padding: Spacing.sm,

    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 28,
    backgroundColor: Colors.gray[200],
    marginBottom: Spacing.xs,
    marginLeft: 25
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textAlign: "center",
  },
  description: {
    fontSize: FontSize.xs,
    textAlign: "center",
    lineHeight: 16,
    minHeight: 32,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  membercount: {
    fontSize: FontSize.xs,
    textAlign: "center",
    fontWeight: FontWeight.regular
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: "stretch",
    alignItems: "center",
    marginTop: 1
  },
  ctaText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  bannerClose: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    paddingLeft: Spacing.sm,
  },
})
