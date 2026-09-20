





//  app/(messages)/new.tsx ─

import React, { useState, useCallback, useRef, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Image } from "expo-image"
import { useLocalSearchParams } from "expo-router"
import { router } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { useConversations } from "@/hooks/useConversations"
import { useGroupManagement } from "@/hooks/useGroupManagement"
import { messagingService, UserSearchResult } from "@/services/messaging.service"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useQueryClient } from "@tanstack/react-query"
import { AnimatedBanner,BannerState,BannerType } from "@/components/activityIndicator/AnimatedBanner"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
//  mode type 
type Mode = "dm" | "group"

export default function NewMessageScreen() {
  const theme = useTheme()
  const queryClient=useQueryClient()
  const { user } = useAuthStore()
  const { refetch } = useConversations()
  const { createGroup, isCreating } = useGroupManagement()
  const { tab } = useLocalSearchParams<{ tab: string }>()
  const [banner, setBanner] = useState<BannerState | null>(null);
  //  screen state ─
  const [mode, setMode] = useState<Mode>("dm")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // group-only state
  const [groupName, setGroupName] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>([])

  // debounce timer ref — clears previous timeout on every keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  //  search ─
  // Debounced 400ms so we don't hit the API on every character typed.
  // Filters out the current user from results — you can't DM or group yourself.
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!text.trim()) {
      setSearchResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await messagingService.searchUsers(text)
        // exclude self and, in group mode, already-selected members
        const selectedIds = new Set(selectedMembers.map((m) => m.id))
        setSearchResults(
          results.filter((r) => r.id !== user?.id && !selectedIds.has(r.id))
        )
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }, [user?.id, selectedMembers])

  //  mode switch 
  // Reset all state when toggling between DM and Group so nothing leaks across
  const handleModeSwitch = (next: Mode) => {
    setMode(next)
    setSearchQuery("")
    setSearchResults([])
    setSelectedMembers([])
    setGroupName("")
  }
useEffect(()=>{

  if (tab==="group"){
    setMode("group")
  }
},[])
  //  DM: tap a user → create or open existing conversation 
  const handleSelectDM = async (selected: UserSearchResult) => {
    try {
      const conversation = await messagingService.createConversation({
        recipient_id: selected.id,
        initial_message: "👋",   // silent opener — backend requires a first message
      })
     
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.replace(`/messages/${conversation.id}` as any)
    } catch (e :any){
      const detail=e.response.data.detail?? ""
       showBanner("error",`Error starting conversation with this ${selected.username}. ${detail} `)
    }
  }

  //  Group: add / remove selected members 
  const handleAddMember = (member: UserSearchResult) => {
    setSelectedMembers((prev) => [...prev, member])
    // remove from results immediately so they don't appear selectable again
    setSearchResults((prev) => prev.filter((r) => r.id !== member.id))
    setSearchQuery("")
  }
const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  //  Group: create 
  const handleCreateGroup = () => {
    if (!canCreate) return

    createGroup(
      {
        group_name: groupName.trim(),
        participant_ids: selectedMembers.map((m) => m.id),
        // use the group name as the opening message so the chat isn't empty
        // the user types their real first message once inside the chat
        initial_message: `${groupName.trim()} group created`,
      },
      {
        onSuccess: () => {
          refetch()
          router.replace("/messages")
        },
      }
    )
  }

  // create button is only active when there's a name and at least 2 members
  const canCreate = groupName.trim().length > 0 && selectedMembers.length >= 2

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
       {banner && (
        <AnimatedBanner
          key={banner.id}
          type={banner.type}
          message={banner.message}
          onHide={() => setBanner(null)}
        />
      )}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/*  header  */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            New Message
          </Text>

          {/* placeholder to keep title centred */}
          <View style={styles.headerSpacer} />
        </View>

        {/*  DM / Group toggle  */}
        <View style={[styles.toggleContainer, { backgroundColor: theme.background }]}>
          {(["dm", "group"] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.toggleButton,
                mode === m ? { backgroundColor: theme.primary } :{borderColor:theme.borderMuted},
              ]}
              onPress={() => handleModeSwitch(m)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: mode === m ? "#fff" : theme.textSecondary },
                ]}
              >
                {m === "dm" ? "Direct Message" : "Group Chat"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/*  group name input (group mode only)  */}
        {mode === "group" && (
          <View style={[styles.inputRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>
              Name
            </Text>
            <TextInput
              style={[styles.groupNameInput, { color: theme.textPrimary }]}
              placeholder="Group name..."
              placeholderTextColor={theme.textMuted}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={100}
              returnKeyType="next"
              autoFocus
            />
          </View>
        )}

        {/*  selected members chips (group mode only)  */}
        {mode === "group" && selectedMembers.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.chipsScroll, { borderBottomColor: theme.border }]}
            contentContainerStyle={styles.chipsContent}
          >
            {selectedMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[styles.chip, { backgroundColor: theme.primary + "20" }]}
                onPress={() => handleRemoveMember(member.id)}
                activeOpacity={0.7}
              >
                {/* avatar thumbnail in the chip */}
                <Image
                  source={{ uri: member.avatar ?? undefined }}
                  style={styles.chipAvatar}
                  contentFit="cover"
                />
                <Text style={[styles.chipText, { color: theme.primary }]}>
                  @{member.username}
                </Text>
                {/* tap chip to remove — × icon signals this */}
                <Text style={[styles.chipRemove, { color: theme.primary }]}>×</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/*  search bar ─ */}
        <View style={[styles.searchRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.textMuted }]}>
            {mode === "dm" ? "To" : "Add"}
          </Text>
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search by username..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            // only autoFocus on DM mode — group mode autofocuses the name field
            autoFocus={mode === "dm"}
          />
          {isSearching && (
            <ActivityIndicator
              size="small"
              color={theme.primary}
              style={styles.searchSpinner}
            />
          )}
        </View>

        {/*  search results list  */}
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"   // so tapping a result doesn't dismiss keyboard
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.resultRow, { borderBottomColor: theme.border }]}
              onPress={() =>
                mode === "dm" ? handleSelectDM(item) : handleAddMember(item)
              }
              activeOpacity={0.7}
            >
               {(item?.avatar === null || item?.avatar === undefined || !item.avatar.trim()) ?
                            (<View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(item?.username ?? "DM")}` }]}>
                              <Text>{item?.username.charAt(0)}</Text>
                            </View>
                            ) : (
              <Image
                source={{ uri: item.avatar ?? undefined }}
                style={styles.resultAvatar}
                contentFit="cover"
              />
              )}
              <View style={styles.resultInfo}>
                <Text style={[styles.resultUsername, { color: theme.textPrimary }]}>
                  @{item.username}
                </Text>
              </View>
              {/* visual hint: + icon in group mode, arrow in DM mode */}
              <Text style={[styles.resultAction, { color: theme.primary }]}>
                {mode === "group" ? "＋" : "→"}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            searchQuery.length > 0 && !isSearching ? (
              <View style={styles.emptyResults}>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  No users found for "{searchQuery}"
                </Text>
              </View>
            ) : null
          }
        />

        {/*  create group button (group mode only) ─ */}
        {mode === "group" && (
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            {/* member count hint — helps user understand the minimum */}
            <Text style={[styles.memberCount, { color: theme.textMuted }]}>
              {selectedMembers.length === 0
                ? "Add at least 2 members"
                : selectedMembers.length === 1
                ? "Add 1 more member"
                : `${selectedMembers.length} members selected`}
            </Text>

            <TouchableOpacity
              style={[
                styles.createButton,
                {
                  backgroundColor: canCreate ? theme.primary : theme.border,
                },
              ]}
              onPress={handleCreateGroup}
              disabled={!canCreate || isCreating}
              activeOpacity={0.8}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.createButtonText}>Create Group</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  cancelText: {
    fontSize: FontSize.md,
  },
  headerSpacer: {
    width: 54,   // same width as cancel text to keep title centred
  },

  // mode toggle
  toggleContainer: {
    flexDirection: "row",
    margin: Spacing.md,
    borderRadius: Radius.lg,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: "center",
    borderWidth:1
  },
  toggleText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // group name input row
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    width: 40,
  },
  groupNameInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.xs,
  },

  // chips row
  chipsScroll: {
    borderBottomWidth: 1,
    maxHeight: 56,
  },
  chipsContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    gap: 4,
  },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.gray[200],
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  chipRemove: {
    fontSize: FontSize.md,
    lineHeight: 18,
  },

  // search row
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.xs,
  },
  searchSpinner: {
    marginLeft: Spacing.xs,
  },

  // results
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  resultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray[200],
  },
  resultInfo: {
    flex: 1,
  },
  resultUsername: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
   usernamePlcaholder: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    borderRadius: 14,
  },
  resultAction: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.regular,
  },
  emptyResults: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: FontSize.sm,
    textAlign: "center",
  },

  // footer
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  memberCount: {
    fontSize: FontSize.xs,
    textAlign: "center",
  },
  createButton: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
})


