import { useState } from "react"
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { communityservice } from "@/services/community.sevice"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useAuthStore } from "@/stores/auth.store"
import BouncingBarsIndicator from "@/components/activityIndicator/BouncingBarsIndicator"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import { useToast } from "@/components/activityIndicator/ToastProvider"
import { useTheme } from "@/hooks/useTheme"
export default function CommunityInfo() {
  const { slug ,role} = useLocalSearchParams<{ slug: string ,role:string}>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const theme=useTheme()
  const { user } = useAuthStore()
    const {showToast}=useToast()
  const {
    data: groupData,
    isLoading: isLoadingGroup,
    isError: isLoadGroupError,
    refetch: refetchGroup,
  } = useQuery({
    queryKey: ["groups", "detail", slug],
    queryFn: () => communityservice.getCommunityData(slug),
    enabled: !!slug,
  })
  const {
    mutate: leaveGroup,
    isPending: isLeaving,
  } = useMutation({
    // TODO: plug in your leave mutation fn, e.g.:
    // mutationFn: () => communityservice.leaveCommunity(slug),
    mutationFn: async () => {
      communityservice.leavegroup(slug)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", "detail", slug] })
      queryClient.invalidateQueries({ queryKey: ["groups", "mine"] })
      router.replace("/Communities")
    },
  })

  if (isLoadingGroup) {
    return (
      <View style={styles.centered}>
        <BouncingBarsIndicator />
      </View>
    )
  }

  if (isLoadGroupError || !groupData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load community info.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetchGroup()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView
          style={[styles.container, { backgroundColor: theme.background }]}
          edges={["top"]}
        >
    <ScrollView contentContainerStyle={styles.container}>
      {groupData.cover_image ? (
        <Image source={{ uri: groupData.cover_image }} style={styles.coverImage} />
      ) : (
        <View style={[styles.coverImage, styles.coverImagePlaceholder,{backgroundColor:getAvatarColor(groupData.name?? "G")}]}>
            <Text>{groupData.name.charAt(0)}</Text>
             </View>
      )}

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.name,{color:theme.textPrimary}]}>{groupData.name}</Text>
          <View style={styles.privacyBadge}>
            <Text style={[styles.privacyBadgeText,{color:theme.primary}]}>{groupData.privacy}</Text>
          </View>
        </View>

        {(groupData?.members_count ?? 0 )>=0 ? (
          <Text style={[styles.members,{color:theme.textPrimary}]}>{groupData.members_count} members</Text>
        ) : null}

        <Text style={[styles.sectionTitle,{color:theme.textPrimary}]}>Description</Text>
        <Text style={[styles.description,{color:theme.textPrimarylight}]}>{groupData.description}</Text>

        {groupData.rules && groupData.rules.length > 0 && (
          <>
            <Text style={[styles.sectionTitle,{color:theme.textPrimary}]}>Rules</Text>
            {groupData.rules.map((rule, index) => (
              <View key={index} style={styles.ruleRow}>
                <Text style={styles.ruleIndex}>{index + 1}.</Text>
                <Text style={[styles.ruleText,{color:theme.textPrimarylight}]}>{rule}</Text>
              </View>
            ))}
          </>
        )}

        { user && role!=="admin" && <TouchableOpacity
          style={[styles.leaveButton, isLeaving && styles.leaveButtonDisabled]}
          onPress={() => showToast({
            title:"Leave this group?",
            message:"Cannot be undone. You can always rejoin.",
            onConfirm:()=>{leaveGroup()}
          })}
          disabled={isLeaving}
        >
          {isLeaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.leaveButtonText}>Leave Group</Text>
          )}
        </TouchableOpacity>}
      </View>
    </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: "#b00020",
    marginBottom: 12,
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#222",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  coverImage: {
    width: 180,
    height: 180,
    marginHorizontal:"auto"
  },
  coverImagePlaceholder: {
    backgroundColor: "#e0e0e0",
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    flexShrink: 1,
  },
  privacyBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#eee",
    marginLeft: 8,
  },
  privacyBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  members: {
    marginTop: 4,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
  },
  ruleRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  ruleIndex: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 6,
    color: "#333",
  },
  ruleText: {
    fontSize: 14,
    color: "#333",
    flexShrink: 1,
  },
  leaveButton: {
    marginTop: 28,
    backgroundColor: "#b00020",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveButtonDisabled: {
    opacity: 0.6,
  },
  leaveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
})