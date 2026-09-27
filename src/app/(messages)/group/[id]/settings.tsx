//  app/messages/group/[id]/settings.tsx ─

import React, { useState, useCallback, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { Image } from "expo-image"
import { useQuery } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { useGroupManagement, GroupMember } from "@/hooks/useGroupManagement"
import { useConversations } from "@/hooks/useConversations"
import { messagingService, UserSearchResult } from "@/services/messaging.service"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
//  avatar helpers (same as GroupConversationItem + [id].tsx) ─

const getInitials = (name: string) =>
  name.trim().split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")

export default function GroupSettingsScreen() {
  const theme = useTheme()
  const { id: conversationId } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuthStore()
  const { removeConversation } = useConversations()

  const {
    members,
    membersLoading,
    refetch,
    updateGroup,
    isUpdating,
    addMembers,
    isAddingMembers,
    removeMember,
    isRemoving,
    leaveGroup,
    isLeaving,
    isError,
  } = useGroupManagement(conversationId)

  //  load conversation for group name / avatar / admin check 
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: messagingService.getConversations,
  })
  const conversation = conversations?.find((c) => c.id === conversationId)

  // current user's admin status — checked from participants list
  const isAdmin = members.find((m) => m.id === user?.id)?.is_admin ?? false

  //  edit group name state ─
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(conversation?.group_name ?? "")
  const nameInputRef = useRef<TextInput>(null)

  const handleSaveName = () => {
    if (!nameInput.trim() || nameInput.trim() === conversation?.group_name) {
      setIsEditingName(false)
      return
    }
    updateGroup(
      { conversationId, group_name: nameInput.trim() },
      {
        onSuccess: () => setIsEditingName(false),
        onError: () => Alert.alert("Error", "Failed to update group name. Try again."),
      }
    )
  }

  const handleStartEdit = () => {
    setNameInput(conversation?.group_name ?? "")
    setIsEditingName(true)
    // slight delay so the input mounts before we focus it
    setTimeout(() => nameInputRef.current?.focus(), 100)
  }

  //  add members modal state ─
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedToAdd, setSelectedToAdd] = useState<UserSearchResult[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // existing member IDs — used to exclude them from search results
  const existingMemberIds = new Set(members.map((m) => m.id))

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text.trim()) { setSearchResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await messagingService.searchUsers(text)
        const selectedIds = new Set(selectedToAdd.map((s) => s.id))
        // exclude current members and already-selected users
        setSearchResults(
          results.filter((r) => !existingMemberIds.has(r.id) && !selectedIds.has(r.id))
        )
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }, [existingMemberIds, selectedToAdd])

  const handleSelectToAdd = (member: UserSearchResult) => {
    setSelectedToAdd((prev) => [...prev, member])
    setSearchResults((prev) => prev.filter((r) => r.id !== member.id))
    setSearchQuery("")
  }

  const handleRemoveFromSelected = (id: string) => {
    setSelectedToAdd((prev) => prev.filter((m) => m.id !== id))
  }

  const handleConfirmAdd = () => {
    if (!selectedToAdd.length) return
    addMembers(
      { conversationId, user_ids: selectedToAdd.map((m) => m.id) },
      {
        onSuccess: () => {
          setShowAddModal(false)
          setSelectedToAdd([])
          setSearchQuery("")
        },
        onError: (e: any) => {
          const msg = e.response?.data?.detail ?? "Failed to add members. A block may exist."
          Alert.alert("Error", msg)
        },
      }
    )
  }

  const handleCloseAddModal = () => {
    setShowAddModal(false)
    setSelectedToAdd([])
    setSearchQuery("")
    setSearchResults([])
  }

  //  remove a member 
  const handleRemoveMember = (member: GroupMember) => {
    Alert.alert(
      "Remove member",
      `Remove @${member.username} from the group?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            removeMember(
              { conversationId, targetUserId: member.id },
              {
                onError: () => Alert.alert("Error", "Failed to remove member. Try again."),
              }
            ),
        },
      ]
    )
  }

  //  leave group 
  const handleLeave = () => {
    Alert.alert(
      "Leave group",
      `Leave ${conversation?.group_name ?? "this group"}? You won't receive new messages.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () =>
            leaveGroup(conversationId, {
              onSuccess: () => {
                removeConversation(conversationId)
                router.replace("/messages")
              },
            }),
        },
      ]
    )
  }

  //  render one member row 
  const renderMember = ({ item }: { item: GroupMember }) => {
    const isSelf = item.id === user?.id

    return (

      <View style={[styles.memberRow, { borderBottomColor: theme.border }]}>
        {/* avatar */}

        <TouchableOpacity
          style={styles.headerUser}
          onPress={() => router.push(`/profile/${item.username}`)}>
          {item.avatar == null || !item.avatar || item.avatar == undefined ?
            (

              <View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(item.username)}` }]}>
                <Text style={[{fontSize:FontSize.lg,color:"#fff"}]}>  {item.username.charAt(0)}</Text>
              </View>
            ) : (
              <Image
                source={{ uri: item.avatar }}
                style={styles.memberAvatar}
                contentFit="cover"
              />
            )
          }

          {/* name + admin badge */}
          <View style={styles.memberInfo}>
            <View style={styles.memberNameRow}>
              <Text style={[styles.memberUsername, { color: theme.textPrimary }]}>
                @{item.username}
                {isSelf && (
                  <Text style={[styles.selfLabel, { color: theme.textMuted }]}> (You)</Text>
                )}
              </Text>

              {/* admin crown badge */}
              {item.is_admin && (
                <View style={[styles.adminBadge, { backgroundColor: theme.primary + "20" }]}>
                  <Text style={[styles.adminBadgeText, { color: theme.primary }]}>
                    👑 Admin
                  </Text>
                </View>
              )}
            </View>

            {item.joined_at && (
              <Text style={[styles.joinedAt, { color: theme.textMuted }]}>
                Joined {new Date(item.joined_at).toLocaleDateString("en-KE", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* remove button — admin only, can't remove self (use Leave instead) */}
        {isAdmin && !isSelf && (
          <TouchableOpacity
            style={[styles.removeBtn, { borderColor: Colors.error ?? "#EF4444" }]}
            onPress={() => handleRemoveMember(item)}
            disabled={isRemoving}
          >
            <Text style={[styles.removeBtnText, { color: Colors.error ?? "#EF4444" }]}>
              Remove
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {isAdmin ? "Group Settings" : "Group Info"}
        </Text>

        {/* spacer to centre title */}
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/*  group avatar section ─ */}
        <View style={styles.avatarSection}>
          {conversation?.group_avatar != null || conversation?.group_avatar || conversation?.group_avatar != undefined ? (
            <Image
              source={{ uri: conversation.group_avatar }}
              style={styles.largeAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={[
              styles.largeAvatar,
              styles.largeInitialsCircle,
              { backgroundColor: getAvatarColor(conversation?.group_name ?? "G") },
            ]}>
              <Text style={styles.largeInitialsText}>
                {getInitials(conversation?.group_name ?? "G")}
              </Text>
            </View>
          )}

          {/* admin can change the avatar — tapping navigates to image picker
              image upload is handled by your existing upload flow */}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.editAvatarBtn, { backgroundColor: theme.primary }]}
              onPress={() => router.push(`/(messages)/group/${conversationId}/avatar` as any)}
            >
              <Text style={styles.editAvatarIcon}>📷</Text>
            </TouchableOpacity>
          )}
        </View>

        {/*  group name section ─ */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>GROUP NAME</Text>

          <View style={styles.nameRow}>
            {isEditingName ? (
              // editable input — admin only
              <View style={styles.nameEditRow}>
                <TextInput
                  ref={nameInputRef}
                  style={[styles.nameInput, { color: theme.textPrimary, borderColor: theme.primary }]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  maxLength={100}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveName}
                  disabled={isUpdating}
                >
                  {isUpdating
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelEditBtn, { borderColor: theme.border }]}
                  onPress={() => setIsEditingName(false)}
                >
                  <Text style={[styles.cancelEditText, { color: theme.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // display mode
              <>
                <Text style={[styles.groupNameDisplay, { color: theme.textPrimary }]}>
                  {conversation?.group_name ?? "Group"}
                </Text>
                {/* pencil icon — admin only */}
                {isAdmin && (
                  <TouchableOpacity onPress={handleStartEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={[styles.editIcon, { color: theme.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold }]}>Edit</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {/*  members section  */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
              MEMBERS · {members.length}
            </Text>

            {/* add members button — admin only */}
            {isAdmin && (
              <TouchableOpacity
                style={[styles.addMembersBtn, { backgroundColor: theme.primary + "15" }]}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={[styles.addMembersBtnText, { color: theme.primary }]}>
                  ＋ Add
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {membersLoading ? (
            <ActivityIndicator color={theme.primary} style={styles.membersLoader} />
          ) :
            isError ? (
              <View style={styles.loading}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={[styles.errorText, { color: theme.textMuted }]}>Failed to load members</Text>
                <TouchableOpacity style={[styles.retryBtn, { borderColor: theme.primary }]} onPress={() => refetch()}>
                  <Text style={[styles.retryText, { color: theme.primary }]}>Try again</Text>
                </TouchableOpacity>
              </View>) : (
              <FlatList
                data={members}
                keyExtractor={(item) => item.id}
                renderItem={renderMember}
                scrollEnabled={false}  // parent ScrollView handles scrolling
              />
            )}
        </View>

        {/*  leave group button — available to everyone  */}
        <TouchableOpacity
          style={[styles.leaveBtn, { borderColor: Colors.error ?? "#EF4444" }]}
          onPress={handleLeave}
          disabled={isLeaving}
        >
          {isLeaving
            ? <ActivityIndicator color={Colors.error ?? "#EF4444"} size="small" />
            : <Text style={[styles.leaveBtnText, { color: Colors.error ?? "#EF4444" }]}>
              Leave Group
            </Text>}
        </TouchableOpacity>

        {/* bottom padding so leave button isn't flush to the screen edge */}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* 
          ADD MEMBERS MODAL — admin only
          Same search + chip pattern as the group creation screen
       */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Modal
          visible={showAddModal}
          transparent
          animationType="slide"
          onRequestClose={handleCloseAddModal}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCloseAddModal}
          />
          <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>

            {/* modal header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Add Members
              </Text>
              <TouchableOpacity onPress={handleCloseAddModal}>
                <Text style={[styles.modalClose, { color: theme.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* selected users chips */}
            {selectedToAdd.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsContent}
              >
                {selectedToAdd.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[styles.chip, { backgroundColor: theme.primary + "20" }]}
                    onPress={() => handleRemoveFromSelected(member.id)}
                  >
                    {(member?.avatar === null || member?.avatar === undefined || !member.avatar.trim()) ?
                      (<View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(member?.username ?? "DM")}` }]}>
                        <Text>{member?.username.charAt(0)}</Text>
                      </View>
                      ) : (
                        <Image source={{ uri: member.avatar ?? undefined }} style={styles.chipAvatar} contentFit="cover" />
                      )}

                    <Text style={[styles.chipText, { color: theme.primary }]}>@{member.username}</Text>
                    <Text style={[styles.chipRemove, { color: theme.primary }]}>×</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* search bar */}
            <View style={[styles.searchRow, { borderColor: theme.border }]}>
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholder="Search by username..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              {isSearching && <ActivityIndicator size="small" color={theme.primary} />}
            </View>

            {/* search results */}
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.resultsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.resultRow, { borderBottomColor: theme.border }]}
                  onPress={() => handleSelectToAdd(item)}
                >
                  {(item?.avatar === null || item?.avatar === undefined || !item.avatar.trim()) ?
                      (<View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(item?.username ?? "DM")}` }]}>
                        <Text>{item?.username.charAt(0)}</Text>
                      </View>
                      ) : (
                        <Image source={{ uri: item.avatar ?? undefined }} style={styles.chipAvatar} contentFit="cover" />
                      )}
                  <Text style={[styles.resultUsername, { color: theme.textPrimary }]}>
                    @{item.username}
                  </Text>
                  <Text style={[styles.resultAdd, { color: theme.primary }]}>＋</Text>
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

            {/* confirm add button */}
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: selectedToAdd.length > 0 ? theme.primary : theme.border },
              ]}
              onPress={handleConfirmAdd}
              disabled={selectedToAdd.length === 0 || isAddingMembers}
            >
              {isAddingMembers
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.confirmBtnText}>
                  Add {selectedToAdd.length > 0 ? `${selectedToAdd.length} member${selectedToAdd.length > 1 ? "s" : ""}` : "Members"}
                </Text>}
            </TouchableOpacity>

          </View>
        </Modal>
      </KeyboardAvoidingView>

    </SafeAreaView >
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
  backIcon: { fontSize: 24, fontWeight: FontWeight.bold },
  headerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },

  // avatar
  avatarSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    position: "relative",
  },
  largeAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.gray[200],
  },
  largeInitialsCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  largeInitialsText: {
    color: "#fff",
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: Spacing.xl - 4,
    right: "32%",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  usernamePlcaholder: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    borderRadius: 14,
  },
  editAvatarIcon: { fontSize: 16 },

  // sections
  section: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },

  // group name
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  nameInput: {
    flex: 1,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  groupNameDisplay: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  editIcon: { fontSize: FontSize.md },
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  saveBtnText: { color: "#fff", fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  cancelEditBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelEditText: { fontSize: FontSize.sm },

  // add members button
  addMembersBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  addMembersBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // member row
  membersLoader: { paddingVertical: Spacing.lg },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray[200],
  },
  memberInfo: { flex: 1 },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  memberUsername: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  selfLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.regular },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  adminBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  joinedAt: { fontSize: FontSize.xs, marginTop: 2 },
  removeBtn: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  removeBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  // leave button
  leaveBtn: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  leaveBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },

  // add members modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    minHeight: "80%",
    gap: Spacing.sm,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  modalClose: { fontSize: 18, padding: 4 },
  chipsScroll: { maxHeight: 52 },
  chipsContent: { gap: Spacing.xs, alignItems: "center", paddingVertical: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    gap: 4,
  },
  chipAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.gray[200] },
  chipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  chipRemove: { fontSize: FontSize.md, lineHeight: 18 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.md },
  resultsList: { maxHeight: 240 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  resultAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gray[200] },
  resultUsername: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  resultAdd: { fontSize: FontSize.xl },
  emptyResults: { padding: Spacing.lg, alignItems: "center" },
  emptyText: { fontSize: FontSize.sm, textAlign: "center" },
  confirmBtn: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  confirmBtnText: { color: "#fff", fontSize: FontSize.md, fontWeight: FontWeight.bold },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorIcon: { fontSize: 32, marginBottom: Spacing.sm, textAlign: "center" },
  errorText: { fontSize: FontSize.sm, textAlign: "center", marginBottom: Spacing.md },
  retryBtn: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  retryText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
})







